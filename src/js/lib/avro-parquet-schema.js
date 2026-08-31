/* Avro + Parquet schema reader.
 *
 * Pure, dependency-free core for the Avro & Parquet schema viewer tool
 * (src/js/tools/avro-parquet-viewer.js), tested in test/avro-parquet-schema.test.js.
 *
 *  - .avsc files are plain JSON: parse the text.
 *  - .avro container files carry their schema in a binary header: a
 *    map<string,bytes> of metadata that includes the "avro.schema" (JSON text)
 *    and "avro.codec" entries.
 *  - .parquet files carry a Thrift Compact Protocol FileMetaData footer: the
 *    last 8 bytes hold a little-endian length and the "PAR1" magic. We decode
 *    just enough of that compact-encoded struct to pull the format version,
 *    created_by, num_rows, the schema tree, and the first column's codec.
 *
 * No frameworks, no WASM, nothing to install - it only reads bytes.
 */

/* ---- detection ------------------------------------------------------- */

const AVRO_MAGIC = [0x4f, 0x62, 0x6a, 0x01]; // "Obj" + 0x01
const PAR1 = "PAR1";

export function isAvro(u8) {
  return u8.length >= 4 && u8[0] === AVRO_MAGIC[0] && u8[1] === AVRO_MAGIC[1] &&
    u8[2] === AVRO_MAGIC[2] && u8[3] === AVRO_MAGIC[3];
}

export function isParquet(u8) {
  if (u8.length < 8) return false;
  const view = new DataView(u8.buffer, u8.byteOffset + u8.length - 4, 4);
  return (
    view.getUint8(0) === 0x50 && view.getUint8(1) === 0x41 &&
    view.getUint8(2) === 0x52 && view.getUint8(3) === 0x31
  );
}

/** Decide which reader applies, by filename extension first, then magic bytes. */
export function detectFormat(filename, u8) {
  const name = String(filename || "").toLowerCase();
  if (name.endsWith(".avsc")) return "avsc";
  if (name.endsWith(".avro") || name.endsWith(".avr")) return "avro";
  if (name.endsWith(".parquet") || name.endsWith(".parq") || name.endsWith(".pq")) return "parquet";
  if (u8) {
    if (isAvro(u8)) return "avro";
    if (isParquet(u8)) return "parquet";
  }
  return null;
}

/* ---- Avro ------------------------------------------------------------ */

class AvroReader {
  constructor(u8) { this.u8 = u8; this.i = 0; }
  byte() { return this.u8[this.i++]; }
  // Avro long = zigzag LEB128 varint.
  long() {
    let shift = 0, b = 0, result = 0;
    do {
      b = this.byte();
      result |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80);
    return (result >>> 1) ^ -(result & 1);
  }
  string() {
    const len = this.long();
    if (len < 0 || this.i + len > this.u8.length) throw new Error("truncated string");
    const s = new TextDecoder().decode(this.u8.subarray(this.i, this.i + len));
    this.i += len;
    return s;
  }
  bytes() {
    const len = this.long();
    if (len < 0 || this.i + len > this.u8.length) throw new Error("truncated bytes");
    const b = this.u8.subarray(this.i, this.i + len);
    this.i += len;
    return b;
  }
}

// Avro map<string,bytes>: one or more blocks of (long count) then count
// key/value pairs, terminated by a count of zero. A negative count is followed
// by the block's byte count and its absolute value is the number of entries.
function readAvroMetaMap(r) {
  const map = {};
  for (;;) {
    let count = r.long();
    if (count === 0) break;
    if (count < 0) { r.long(); count = -count; }
    for (let k = 0; k < count; k++) { const key = r.string(); map[key] = r.bytes(); }
  }
  return map;
}

/** Parse a binary Avro data file (.avro) header into its schema + codec. */
export function readAvroContainer(u8) {
  if (!isAvro(u8)) throw new Error("not an Avro container file (bad magic)");
  const r = new AvroReader(u8);
  r.i = 4; // skip the magic
  const meta = readAvroMetaMap(r);
  const schemaBytes = meta["avro.schema"];
  if (!schemaBytes) throw new Error("Avro header has no avro.schema entry");
  let schema;
  try { schema = JSON.parse(new TextDecoder().decode(schemaBytes)); }
  catch { throw new Error("avro.schema is not valid JSON"); }
  const codec = meta["avro.codec"] ? new TextDecoder().decode(meta["avro.codec"]) : "null";
  return { format: "avro", codec, schema };
}

/** Parse .avsc - a raw JSON schema document. */
export function readAvsc(text) {
  let schema;
  try { schema = JSON.parse(text); }
  catch { throw new Error("not valid JSON (an .avsc is a JSON schema document)"); }
  return { format: "avsc", codec: null, schema };
}

/* ---- Parquet (Thrift Compact Protocol) ------------------------------ */

// TCompactProtocol type IDs (these differ from the binary protocol's):
const T = {
  STOP: 0, BOOLEAN_TRUE: 1, BOOLEAN_FALSE: 2, BYTE: 3, I16: 4, I32: 5,
  I64: 6, DOUBLE: 7, BINARY: 8, LIST: 9, SET: 10, MAP: 11, STRUCT: 12,
};

const COMPRESSION = ["UNCOMPRESSED", "SNAPPY", "GZIP", "LZO", "BROTLI", "LZ4", "ZSTD", "LZ4_RAW"];
const PARQUET_TYPE = ["BOOLEAN", "INT32", "INT64", "INT96", "FLOAT", "DOUBLE", "BYTE_ARRAY", "FIXED_LEN_BYTE_ARRAY"];
const REPETITION = ["REQUIRED", "OPTIONAL", "REPEATED"];
const CONVERTED = ["UTF8", "MAP", "MAP_KEY_VALUE", "LIST", "ENUM", "DECIMAL", "DATE", "TIME_MILLIS", "TIME_MICROS", "TIMESTAMP_MILLIS", "TIMESTAMP_MICROS", "UINT_8", "UINT_16", "UINT_32", "UINT_64", "INT_8", "INT_16", "INT_32", "INT_64", "JSON", "BSON", "INTERVAL"];
const LOGICAL = { 1: "STRING", 2: "MAP", 3: "LIST", 4: "ENUM", 5: "DECIMAL", 6: "DATE", 7: "TIME", 8: "TIMESTAMP", 9: "INTEGER", 10: "UNKNOWN", 11: "JSON", 12: "BSON", 13: "UUID", 14: "FLOAT16" };

class CompactReader {
  constructor(u8) { this.u8 = u8; this.i = 0; }
  byte() { return this.u8[this.i++]; }
  // Unsigned LEB128 varint.
  varint() {
    let shift = 0, result = 0, b;
    do {
      b = this.byte();
      result = (result | ((b & 0x7f) << shift)) >>> 0;
      shift += 7;
    } while (b & 0x80);
    return result;
  }
  // Zigzag varint (i16 / i32 / i64). Counts and lengths in parquet footers are
  // small enough that JS Number keeps them exact.
  zig() {
    const n = this.varint();
    return (n >>> 1) ^ -(n & 1);
  }
  i32() { return this.zig(); }
  i64() { return this.zig(); }
  binary() {
    const len = this.varint();
    if (this.i + len > this.u8.length) throw new Error("truncated binary field");
    const s = this.u8.subarray(this.i, this.i + len);
    this.i += len;
    return s;
  }
  string() { return new TextDecoder().decode(this.binary()); }


  // Skip a value of the given compact type. Boolean values ride inside the field
  // header, so they need no bytes here.
  skip(type) {
    switch (type) {
      case T.BOOLEAN_TRUE: case T.BOOLEAN_FALSE: break;
      case T.BYTE: this.i += 1; break;
      case T.I16: case T.I32: case T.I64: this.zig(); break;
      case T.DOUBLE: this.i += 8; break;
      case T.BINARY: this.binary(); break;
      case T.STRUCT: this.struct(); break;
      case T.LIST: case T.SET: {
        let h = this.byte();
        let size = h >> 4;
        if (size === 15) size = this.varint();
        const elem = h & 0x0f;
        for (let k = 0; k < size; k++) this.skip(elem);
        break;
      }
      case T.MAP: {
        let h = this.byte();
        let size = h >> 4;
        if (size === 15) size = this.varint();
        const key = h & 0x0f;
        const val = this.byte();
        for (let k = 0; k < size; k++) { this.skip(key); this.skip(val); }
        break;
      }
      default: throw new Error(`unknown compact type ${type}`);
    }
  }

  // Walk a struct's fields (STOP-delimited). `onField(id, type)` may consume the
  // value itself and return true; otherwise the field is skipped generically.
  struct(onField) {
    let last = 0;
    for (;;) {
      const h = this.byte();
      const type = h & 0x0f;
      if (type === T.STOP) return;
      const id = last + (h >> 4);
      last = id;
      if (!onField) { this.skip(type); continue; }
      if (onField(id, type) !== true) this.skip(type);
    }
  }
}

function readSchemaList(r) {
  let h = r.byte();
  let size = h >> 4;
  if (size === 15) size = r.varint();
  const out = [];
  for (let k = 0; k < size; k++) out.push(readSchemaElement(r));
  return out;
}

function readSchemaElement(r) {
  const el = { name: null, type: null, repetitionType: null, numChildren: null, convertedType: null, logicalType: null };
  r.struct((id, type) => {
    switch (id) {
      case 1: el.type = r.i32(); return true;      // Type
      case 3: el.repetitionType = r.i32(); return true; // FieldRepetitionType
      case 4: el.name = r.string(); return true;   // required name
      case 5: el.numChildren = r.i32(); return true; // num_children
      case 6: el.convertedType = r.i32(); return true; // ConvertedType
      case 10: el.logicalType = readLogicalType(r); return true; // LogicalType
      default: return false;
    }
  });
  return el;
}

function readLogicalType(r) {
  let name = null;
  r.struct((id) => { if (LOGICAL[id]) name = LOGICAL[id]; return false; });
  return name;
}

function readRowGroups(r) {
  let h = r.byte();
  let size = h >> 4;
  if (size === 15) size = r.varint();
  const out = [];
  for (let k = 0; k < size; k++) out.push(readRowGroup(r));
  return out;
}

function readRowGroup(r) {
  const g = { numRows: null, codec: null };
  r.struct((id, type) => {
    switch (id) {
      case 1: g.codec = readColumnsCodec(r); return true; // list<ColumnChunk>
      case 3: g.numRows = r.i64(); return true;           // num_rows
      default: return false;
    }
  });
  return g;
}

// Only the first column's compression codec matters to us, but we must consume
// the whole column list so the enclosing struct stays byte-aligned.
function readColumnsCodec(r) {
  let h = r.byte();
  let size = h >> 4;
  if (size === 15) size = r.varint();
  let found = null;
  for (let k = 0; k < size; k++) {
    const codec = readColumnChunkCodec(r);
    if (found == null && codec != null) found = codec;
  }
  return found;
}

function readColumnChunkCodec(r) {
  let codec = null;
  r.struct((id) => {
    if (id === 3) { // ColumnMetaData
      r.struct((cid) => { if (cid === 4) codec = r.i32(); return cid === 4; });
      return true;
    }
    return false;
  });
  return codec;
}

/** Decode the compact-encoded FileMetaData footer. Throws on bad input. */
export function readParquetMeta(u8) {
  if (u8.length < 8) throw new Error("file too small");
  const view = new DataView(u8.buffer, u8.byteOffset + u8.length - 8, 8);
  const magic =
    String.fromCharCode(view.getUint8(4), view.getUint8(5), view.getUint8(6), view.getUint8(7));
  if (magic !== PAR1) throw new Error("not a Parquet file (missing PAR1 footer)");
  const footerLen = view.getUint32(0, true);
  const start = u8.length - 8 - footerLen;
  if (start < 0) throw new Error("invalid Parquet footer length");
  return readFileMetaData(u8.subarray(start, u8.length - 8));
}

function readFileMetaData(u8) {
  const r = new CompactReader(u8);
  const meta = { version: null, createdBy: null, numRows: null, schema: [], rowGroups: [] };
  r.struct((id) => {
    switch (id) {
      case 1: meta.version = r.i32(); return true;
      case 2: meta.schema = readSchemaList(r); return true;
      case 3: meta.numRows = r.i64(); return true;
      case 4: meta.rowGroups = readRowGroups(r); return true;
      case 6: meta.createdBy = r.string(); return true;
      default: return false;
    }
  });
  return meta;
}

/** Parse a .parquet file into viewable metadata + schema elements. */
export function readParquet(u8) {
  const meta = readParquetMeta(u8);
  const firstCol = meta.rowGroups[0]?.codec;
  return {
    format: "parquet",
    version: meta.version,
    createdBy: meta.createdBy || null,
    numRows: meta.numRows,
    codec: firstCol == null ? null : COMPRESSION[firstCol] || `codec(${firstCol})`,
    schema: meta.schema,
  };
}


/* ---- Normalising into a renderable tree ----------------------------- */
// Both formats become a list of nodes of the shape
//   { name, type, repetition?, converted?, logical?, meta?, children? }
// so the DOM shell can render one tree for either format.

export function avroToNodes(schema) {
  const pickName = (s, fallback) =>
    (s && typeof s === "object" && !Array.isArray(s) && (s.name || s.fullname)) || fallback;

  function node(s, name) {
    if (typeof s === "string") return [{ name, type: s }];
    if (Array.isArray(s)) {
      // union: flatten the branches under one node
      return [{ name, type: "union", children: s.map((b, i) => node(b, `option ${i + 1}`)).flat() }];
    }
    if (s && typeof s === "object") {
      const t = s.type || "record";
      if (t === "record" || t === "error") {
        const label = s.logicalType ? `${t} (${s.logicalType})` : t;
        return [{
          name: pickName(s, name) || t,
          type: label,
          children: (s.fields || []).map((f) => node(f.type, f.name)).flat(),
        }];
      }
      if (t === "array") return [{ name: name || "array", type: "array", children: node(s.items, "items") }];
      if (t === "map") return [{ name: name || "map", type: "map", children: node(s.values, "values") }];
      if (t === "enum") return [{ name: pickName(s, name) || "enum", type: "enum", meta: `symbols: ${(s.symbols || []).join(", ")}` }];
      if (t === "fixed") return [{ name: pickName(s, name) || "fixed", type: "fixed", meta: `size: ${s.size}` }];
      return [{ name: name || t, type: t }];
    }
    return [{ name: name || "?", type: String(s) }];
  }

  return schema ? node(schema, schema?.name || "root") : [];
}

/** Rebuild the hierarchical schema from the flattened pre-order list. */
export function parquetToNodes(schemaList) {
  const list = schemaList || [];
  let idx = 0;
  function build() {
    const el = list[idx++];
    const n = {
      name: el.name || "?",
      type: el.numChildren ? "group" : (PARQUET_TYPE[el.type] != null ? PARQUET_TYPE[el.type] : `type(${el.type})`),
      repetition: el.repetitionType != null ? REPETITION[el.repetitionType] : null,
      converted: el.convertedType != null ? CONVERTED[el.convertedType] : null,
      logical: el.logicalType || null,
    };
    if (el.numChildren) {
      n.children = [];
      for (let k = 0; k < el.numChildren; k++) n.children.push(build());
    }
    return n;
  }
  const nodes = [];
  while (idx < list.length) nodes.push(build());
  return nodes;
}


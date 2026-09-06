import test from "node:test";
import assert from "node:assert/strict";
import {
  detectFormat, isAvro, isParquet, readAvroContainer, readAvsc,
  readParquet, readParquetMeta, avroToNodes, parquetToNodes,
} from "../src/js/lib/avro-parquet-schema.js";

const enc = new TextEncoder();

/* ---- tiny binary helpers for hand-building footers/headers ----------- */
const str = (s) => [...enc.encode(s)];
const varint = (n) => {
  const out = [];
  let v = n >>> 0;
  while (v >= 0x80) { out.push((v & 0x7f) | 0x80); v >>>= 7; }
  out.push(v & 0x7f);
  return out;
};
const zig = (n) => varint((n << 1) ^ (n >> 31)); // zigzag varint (small ints)
const fieldHeader = (id, lastId, type) => [(id - lastId) << 4 | type];
const binaryField = (id, lastId, bytes) => [
  ...fieldHeader(id, lastId, 8), ...varint(bytes.length), ...bytes,
];
const i32Field = (id, lastId, val) => [...fieldHeader(id, lastId, 5), ...zig(val)];

/* ---- AVSC (plain JSON) ---------------------------------------------- */

test("readAvsc parses a JSON schema document", () => {
  const text = '{"type":"record","name":"User","fields":[' +
    '{"name":"id","type":"long"},' +
    '{"name":"name","type":["null","string"]}]}';
  const r = readAvsc(text);
  assert.equal(r.format, "avsc");
  assert.equal(r.schema.name, "User");
});

test("readAvsc rejects non-JSON", () => {
  assert.throws(() => readAvsc("not json"), /Not valid JSON/);
});

test("readAvsc rejects JSON that is not an Avro schema", () => {
  assert.throws(() => readAvsc('{"foo":1}'), /not an Avro schema/);
  assert.throws(() => readAvsc("42"), /not an Avro schema/);
  assert.throws(() => readAvsc("{}"), /not an Avro schema/);
  assert.throws(() => readAvsc("[1,2,3]"), /not an Avro schema/);
});

test("readAvsc accepts a valid union of type names", () => {
  assert.equal(readAvsc('["null","string"]').format, "avsc");
});

test("avroToNodes flattens records and unions into a tree", () => {
  const schema = {
    type: "record", name: "User",
    fields: [
      { name: "id", type: "long" },
      { name: "name", type: ["null", "string"] },
      { name: "tags", type: { type: "array", items: "string" } },
    ],
  };
  const [root] = avroToNodes(schema);
  assert.equal(root.name, "User");
  assert.equal(root.type, "record");
  assert.equal(root.children.length, 3);
  const [nameNode] = root.children.filter((c) => c.name === "name");
  assert.equal(nameNode.type, "union");
  assert.deepEqual(nameNode.children.map((c) => c.type), ["null", "string"]);
  const [tags] = root.children.filter((c) => c.name === "tags");
  assert.equal(tags.type, "array");
  assert.equal(tags.children[0].type, "string");
});

/* ---- AVRO container header ------------------------------------------ */

function buildAvroHeader(schemaObj, codec = "snappy") {
  const schemaBytes = str(JSON.stringify(schemaObj));
  const codecBytes = str(codec);
  const key1 = str("avro.codec");
  const key2 = str("avro.schema");
  const map = [
    0x4f, 0x62, 0x6a, 0x01,        // magic
    ...zig(2),                      // map count = 2 entries
    ...zig(key1.length), ...key1,
    ...zig(codecBytes.length), ...codecBytes,
    ...zig(key2.length), ...key2,
    ...zig(schemaBytes.length), ...schemaBytes,
    ...zig(0),                      // map terminator
  ];
  return new Uint8Array(map);
}

test("readAvroContainer extracts schema and codec from a real header", () => {
  const schema = { type: "record", name: "User", fields: [{ name: "id", type: "long" }] };
  const u8 = buildAvroHeader(schema, "deflate");
  assert.equal(isAvro(u8), true);
  const r = readAvroContainer(u8);
  assert.equal(r.format, "avro");
  assert.equal(r.codec, "deflate");
  assert.equal(r.schema.name, "User");
  assert.deepEqual(avroToNodes(r.schema)[0].children.map((c) => c.name), ["id"]);
});

test("readAvroContainer rejects a bad magic", () => {
  assert.throws(() => readAvroContainer(new Uint8Array([1, 2, 3, 4])), /bad magic/);
});

/* ---- PARQUET footer (Thrift Compact Protocol) ----------------------- */
// Build a minimal FileMetaData:
//   version=1, schema=[{name:"root",num_children:1},
//   {name:"id",type:INT32,repetition:REQUIRED}], num_rows=3,
//   row_groups=[], created_by="nobyte-test"
function buildParquetFile() {
  // SchemaElement root: name(4) 'root', num_children(5) = 1
  const root = [
    ...binaryField(4, 0, str("root")),
    ...i32Field(5, 4, 1),
    0x00, // STOP
  ];
  // SchemaElement id: type(1)=INT32(1), repetition(3)=REQUIRED(0), name(4) 'id'
  const leaf = [
    ...i32Field(1, 0, 1),
    ...i32Field(3, 1, 0),
    ...binaryField(4, 3, str("id")),
    0x00, // STOP
  ];
  const schemaList = [root, leaf].flat();
  const events = [
    i32Field(1, 0, 1),                     // version (field 1)
    fieldHeader(2, 1, 9).concat(0x2c, ...schemaList), // schema: list of 2 structs
    [0x16, ...zig(3)],                     // num_rows (field 3, i64) = 3
    [0x19, 0x0c],                          // row_groups (field 4, LIST) empty
    binaryField(6, 4, str("nobyte-test")), // created_by (field 6)
    0x00,                                  // STOP
  ].flat();

  const file = new Uint8Array(events.length + 8);
  file.set(events, 0);
  new DataView(file.buffer).setUint32(events.length, events.length, true); // footer len
  file.set(str("PAR1"), events.length + 4);
  return file;
}

test("readParquet decodes a minimal footer", () => {
  const file = buildParquetFile();
  assert.equal(isParquet(file), true);

  const meta = readParquetMeta(file);
  assert.equal(meta.version, 1);
  assert.equal(meta.numRows, 3);
  assert.equal(meta.createdBy, "nobyte-test");
  assert.equal(meta.schema.length, 2);

  const r = readParquet(file);
  assert.equal(r.format, "parquet");
  assert.equal(r.version, 1);
  assert.equal(r.numRows, 3);
  assert.equal(r.createdBy, "nobyte-test");
  assert.equal(r.codec, null); // no row groups in our minimal footer

  const [treeRoot] = parquetToNodes(r.schema);
  assert.equal(treeRoot.name, "root");
  assert.equal(treeRoot.type, "group");
  assert.equal(treeRoot.children.length, 1);
  const [idNode] = treeRoot.children;
  assert.equal(idNode.name, "id");
  assert.equal(idNode.type, "INT32");
  assert.equal(idNode.repetition, "REQUIRED");
});

test("readParquetMeta rejects a file without PAR1 magic", () => {
  const bad = new Uint8Array([0, 0, 0, 0, 0, 50, 34, 56]);
  assert.throws(() => readParquetMeta(bad), /PAR1/);
});

/* ---- detection ------------------------------------------------------ */

test("detectFormat prefers extension, then sniffs magic", () => {
  assert.equal(detectFormat("a.avsc"), "avsc");
  assert.equal(detectFormat("a.avro"), "avro");
  assert.equal(detectFormat("a.parquet"), "parquet");
  assert.equal(detectFormat("file.dat", buildAvroHeader({ type: "string" })), "avro");
  assert.equal(detectFormat("file.dat", buildParquetFile()), "parquet");
  assert.equal(detectFormat("file.dat", new Uint8Array([9, 9, 9])), null);
});


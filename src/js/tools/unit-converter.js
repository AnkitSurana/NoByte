// Unit converter — factor-based, with temperature handled specially. All local.
const CATEGORIES = {
  Length: {
    base: "Meter",
    units: { Meter: 1, Kilometer: 1000, Centimeter: 0.01, Millimeter: 0.001, Mile: 1609.344, Yard: 0.9144, Foot: 0.3048, Inch: 0.0254, "Nautical mile": 1852 },
  },
  Weight: {
    base: "Kilogram",
    units: { Kilogram: 1, Gram: 0.001, Milligram: 1e-6, "Metric ton": 1000, Pound: 0.45359237, Ounce: 0.0283495231, Stone: 6.35029318 },
  },
  Temperature: { base: "Celsius", units: { Celsius: 1, Fahrenheit: 1, Kelvin: 1 }, temp: true },
  Area: {
    base: "Square meter",
    units: { "Square meter": 1, "Square kilometer": 1e6, "Square mile": 2589988.11, "Square foot": 0.092903, "Square inch": 0.00064516, Hectare: 10000, Acre: 4046.8564224 },
  },
  Volume: {
    base: "Liter",
    units: { Liter: 1, Milliliter: 0.001, "Cubic meter": 1000, Gallon: 3.785411784, Quart: 0.946352946, Pint: 0.473176473, Cup: 0.2365882365, "Fluid ounce": 0.0295735296, Tablespoon: 0.0147867648, Teaspoon: 0.00492892159 },
  },
  Speed: {
    base: "Meter/second",
    units: { "Meter/second": 1, "Kilometer/hour": 0.277777778, "Mile/hour": 0.44704, Knot: 0.514444444, "Foot/second": 0.3048 },
  },
  "Data": {
    base: "Byte",
    units: { Byte: 1, Kilobyte: 1024, Megabyte: 1048576, Gigabyte: 1073741824, Terabyte: 1099511627776, Bit: 0.125 },
  },
};

const categorySel = document.getElementById("uc-category");
const fromUnit = document.getElementById("uc-from-unit");
const toUnit = document.getElementById("uc-to-unit");
const fromVal = document.getElementById("uc-from-val");
const toVal = document.getElementById("uc-to-val");
const formula = document.getElementById("uc-formula");

function toBase(cat, unit, value) {
  if (cat.temp) {
    if (unit === "Celsius") return value;
    if (unit === "Fahrenheit") return (value - 32) * (5 / 9);
    return value - 273.15; // Kelvin -> Celsius
  }
  return value * cat.units[unit];
}
function fromBase(cat, unit, base) {
  if (cat.temp) {
    if (unit === "Celsius") return base;
    if (unit === "Fahrenheit") return base * (9 / 5) + 32;
    return base + 273.15;
  }
  return base / cat.units[unit];
}

function fillUnits() {
  const cat = CATEGORIES[categorySel.value];
  const names = Object.keys(cat.units);
  [fromUnit, toUnit].forEach((sel) => {
    sel.innerHTML = names.map((n) => `<option>${n}</option>`).join("");
  });
  fromUnit.value = names[0];
  toUnit.value = names[1] || names[0];
}

function convert() {
  const cat = CATEGORIES[categorySel.value];
  const v = parseFloat(fromVal.value);
  if (Number.isNaN(v)) {
    toVal.value = "";
    formula.textContent = "";
    return;
  }
  const result = fromBase(cat, toUnit.value, toBase(cat, fromUnit.value, v));
  const rounded = Math.abs(result) >= 1e-4 && Math.abs(result) < 1e15 ? Number(result.toPrecision(8)) : result;
  toVal.value = String(rounded);
  formula.textContent = `${v} ${fromUnit.value} = ${rounded} ${toUnit.value}`;
}

categorySel.innerHTML = Object.keys(CATEGORIES).map((c) => `<option>${c}</option>`).join("");
categorySel.addEventListener("change", () => { fillUnits(); convert(); });
[fromUnit, toUnit, fromVal].forEach((el) => el.addEventListener("input", convert));
document.getElementById("uc-swap").addEventListener("click", () => {
  [fromUnit.value, toUnit.value] = [toUnit.value, fromUnit.value];
  convert();
});
fillUnits();
convert();

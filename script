const MILES_TO_KILOMETERS = 1.609344;

const distanceInput = document.querySelector("#distance");
const directionInputs = document.querySelectorAll(
  'input[name="direction"]'
);
const resultElement = document.querySelector("#result");

function updateConversion() {
  const rawValue = distanceInput.value.trim();
  const distance = distanceInput.valueAsNumber;
  const direction = document.querySelector(
    'input[name="direction"]:checked'
  ).value;

  if (rawValue === "" || !Number.isFinite(distance)) {
    resultElement.textContent = "Enter a number to see the conversion.";
    return;
  }

  const isKilometersToMiles = direction === "km-to-mi";

  const convertedValue = isKilometersToMiles
    ? distance / MILES_TO_KILOMETERS
    : distance * MILES_TO_KILOMETERS;

  const fromUnit = isKilometersToMiles ? "km" : "mi";
  const toUnit = isKilometersToMiles ? "mi" : "km";

  resultElement.textContent =
    `${distance} ${fromUnit} = ${convertedValue.toFixed(6)} ${toUnit}`;
}

distanceInput.addEventListener("input", updateConversion);

directionInputs.forEach((input) => {
  input.addEventListener("change", updateConversion);
});

updateConversion();

/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SharedTree, TreeViewConfiguration, SchemaFactory, Tree } from "fluid-framework";
import { AzureClient } from "@fluidframework/azure-client";

import { InsecureTokenProvider } from "@fluidframework/test-client-utils";

// const client = new TinyliciousClient();
const user = { id: "userId", name: "userName" };

const config = {
  tenantId: "dc3f3586-b7df-44ad-ba6b-eb4d9f5397ae",
  tokenProvider: new InsecureTokenProvider(
    "3xT6WEULxTipatpvBdsjY0f6mybuRvIL5JOjWjRnaM2uYvSvZg0WJQQJ99AIACw38mny71xuAAAAAZFR7yGb",
    user
  ),
  endpoint: "https://eu.fluidrelay.azure.com",
  type: "remote",
};

const clientProps = {
  connection: config,
};

const client = new AzureClient(clientProps);

const containerSchema = {
	initialObjects: { diceTree: SharedTree },
};

const root = document.getElementById("content");

// The string passed to the SchemaFactory should be unique
const sf = new SchemaFactory("fluidHelloWorldSample");

// Here we define an object we'll use in the schema, a Dice.
class Dice extends sf.object("Dice", {
	value: sf.number,
}) {}

// Here we define the tree schema, which has a single Dice object starting at 1.
// We'll call viewWith() on the SharedTree using this schema, which will give us a tree view to work with.
// The createContainer call includes the parameter "2" which indicates the version of FluidFramework that
// the data in the container is compatible with. For this example, we are using version "2".
// If the tree is new, we'll initialize it with a Dice object with a value of 1.
const treeViewConfiguration = new TreeViewConfiguration({ schema: Dice });

const createNewDice = async () => {
	const { container } = await client.createContainer(containerSchema, "2");
	const dice = container.initialObjects.diceTree.viewWith(treeViewConfiguration);
	dice.initialize(new Dice({ value: 1 }));
	const id = await container.attach();
	renderDiceRoller(dice.root, root);
	return id;
};

const loadExistingDice = async (id) => {
	const { container } = await client.getContainer(id, containerSchema, "2");
	const dice = container.initialObjects.diceTree.viewWith(treeViewConfiguration);
	renderDiceRoller(dice.root, root);
};

async function start() {
	if (location.hash) {
		await loadExistingDice(location.hash.substring(1));
	} else {
		const id = await createNewDice();
		location.hash = id;
	}
}

start().catch((error) => console.error(error));

// Define the view
const template = document.createElement("template");

template.innerHTML = `
  <style>
    .wrapper { text-align: center }
    .dice { font-size: 200px }
    .roll { font-size: 50px;}
  </style>
  <div class="wrapper">
    <div class="dice"></div>
    <button class="roll"> Roll </button>
  </div>
`;

const renderDiceRoller = (dice, elem) => {
	elem.appendChild(template.content.cloneNode(true));

	const rollButton = elem.querySelector(".roll");
	const diceElem = elem.querySelector(".dice");

	// Set the value at our dataKey with a random number between 1 and 6.
	rollButton.onclick = () => {
		dice.value = Math.floor(Math.random() * 6) + 1;
	};

	// Get the current value of the shared data to update the view whenever it changes.
	const updateDice = () => {
		const diceValue = dice.value;
		// Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
		diceElem.textContent = String.fromCodePoint(0x267f + diceValue);
		diceElem.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
	};
	updateDice();

	// Use the changed event to trigger the rerender whenever the value changes.
	Tree.on(dice, "nodeChanged", updateDice);
	// Setting "fluidStarted" is just for our test automation
	window.fluidStarted = true;
};

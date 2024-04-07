// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const config = require("../src/config.json");

const tokens = (n) => {
	return ethers.utils.parseUnits(n.toString(), "ether");
};

async function main() {
	const accounts = await hre.ethers.getSigners();
	funder = accounts[0];
	investor1 = accounts[1];
	investor2 = accounts[2];
	investor3 = accounts[3];
	recipient = accounts[4];

	let transaction;
	//fetch Network
	const { chainId } = await hre.ethers.provider.getNetwork();

	console.log(`fetching token and transfering to accounts.push.apply.\n`);

	const token = await hre.ethers.getContractAt("Token", config[chainId].token.address);
	console.log(`token fetched: ${token.address}\n`);

	//send tokens to accounts
	transaction = await token.transfer(investor1.address, tokens(200000));
	await transaction.wait();

	transaction = await token.transfer(investor2.address, tokens(200000));
	await transaction.wait();

	transaction = await token.transfer(investor3.address, tokens(200000));
	await transaction.wait();

	console.log(`fetching dao...\m`);

	//fetch deployed dao
	const dao = await hre.ethers.getContractAt("DAO", config[chainId].dao.address);
	console.log(`dao fetched: ${dao.address}\n`);

	// Funder sends 100 Ether to DAO treasury for Governace
	await funder.sendTransaction({
		to: dao.address,
		value: tokens("100")
	});
	console.log(`Sent Funds to the treasury\n`);

	for (let i = 0; i < 3; i++) {
		//create proposals
		transaction = await dao.connect(investor1).createProposal(`Proposal ${i++}`, 100, recipient.address);
		await transaction.wait();

		// Vote 1
		transaction = await dao.connect(investor1).vote(1);
		await transaction.wait();

		// Vote 2
		transaction = await dao.connect(investor2).vote(1);
		await transaction.wait();

		// Vote 3
		transaction = await dao.connect(investor3).vote(1);
		await transaction.wait();

		//Finalize Proposal
		transaction = await dao.connect(investor1).finalizeProposal(1);
		await transaction.wait();

		console.log(`Created & Finalized Proposal ${i++}`);
	}

	console.log(`Create one more Proposal....\n`);

	//Create one more Proposal
	transaction = await dao.connect(investor1).createProposal("Proposal 4", 100, recipient.address);
	await transaction.wait();

	// Vote 1
	transaction = await dao.connect(investor2).vote(4);
	await transaction.wait();

	// Vote 2
	transaction = await dao.connect(investor3).vote(4);
	await transaction.wait();

	console.log("Finished.....\n");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

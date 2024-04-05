const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
	return ethers.utils.parseUnits(n.toString(), "ether");
};

const ether = tokens;

describe("DAO", () => {
	let token, dao, deployer, funder;
	let quorum = "500000000000000000000001";
	let investor1, investor2, investor3, investor4, investor5, recipient, user;
	let transaction, result;

	beforeEach(async () => {
		//Setup Accounts
		const accounts = await ethers.getSigners();
		deployer = accounts[0];
		funder = accounts[1];
		investor1 = accounts[2];
		investor2 = accounts[3];
		investor3 = accounts[4];
		investor4 = accounts[5];
		investor5 = accounts[6];
		recipient = accounts[7];
		user = accounts[8];

		// Deploy Token
		const Token = await ethers.getContractFactory("Token");
		token = await Token.deploy("Dapp University", "DAPP", "1000000");

		transaction = await token.connect(deployer).transfer(investor1.address, tokens(200000));
		await transaction.wait();

		transaction = await token.connect(deployer).transfer(investor2.address, tokens(200000));
		await transaction.wait();

		transaction = await token.connect(deployer).transfer(investor3.address, tokens(200000));
		await transaction.wait();

		transaction = await token.connect(deployer).transfer(investor4.address, tokens(200000));
		await transaction.wait();

		transaction = await token.connect(deployer).transfer(investor5.address, tokens(200000));
		await transaction.wait();

		//Deploy DAO
		const DAO = await ethers.getContractFactory("DAO");
		dao = await DAO.deploy(token.address, quorum);

		// Funder sends 100 Ether to DAO treasury for Governace
		await funder.sendTransaction({
			to: dao.address,
			value: ether("100")
		});
	});

	describe("Deployment", () => {
		it("sends ether to the DAO", async () => {
			expect(await ethers.provider.getBalance(dao.address)).to.equal(ether("100"));
		});

		it("returns token address", async () => {
			expect(await dao.token()).to.equal(token.address);
		});

		it("returns quorum", async () => {
			expect(await dao.quorum()).to.equal(quorum);
		});
	});

	describe("Proposal Creation", () => {
		describe("Success", () => {
			beforeEach(async () => {
				transaction = await dao.connect(investor1).createProposal("First Proposal", ether(100), recipient.address);
				result = await transaction.wait();
			});

			it("updates proposal count", async () => {
				expect(await dao.proposalCount()).to.equal(1);
			});

			it("updates proposal mapping", async () => {
				const proposal = await dao.proposals(1);
				expect(proposal.id).to.eq(1);
				expect(proposal.amount).to.eq(ether(100));
				expect(proposal.recipient).to.eq(recipient.address);
			});

			it("emits propose event", async () => {
				//expect(result.events[0].event).to.eq("Propose");
				//console.log(result.events[0].event);
				await expect(transaction).to.emit(dao, "Propose").withArgs(1, ether(100), recipient.address, investor1.address);
			});
		});

		describe("Failure", () => {
			it("rejects insufficent funds", async () => {
				await expect(dao.connect(investor1).createProposal("First Proposal", ether(1000), recipient.address)).to.be.revertedWith("Insufficient balance");
			});

			it("reject non-investor", async () => {
				expect(await dao.connect(investor1).createProposal("First Proposal", ether(100), recipient.address)).to.be.revertedWith("Must be token holder");
			});

			it("checks for quorum", async () => {});
		});
	});

	describe("Voting", () => {
		let transaction, result;

		beforeEach(async () => {
			transaction = await dao.connect(investor1).createProposal("First Proposal", ether(100), recipient.address);
			result = await transaction.wait();
		});

		describe("Success", () => {
			beforeEach(async () => {
				transaction = await dao.connect(investor1).vote(1);
				result = await transaction.wait();
			});

			it("updates vote count", async () => {
				const proposal = await dao.proposals(1);
				expect(proposal.votes).to.eq(tokens(200000));
			});

			it("emits vote event", async () => {
				await expect(transaction).to.emit(dao, "Vote").withArgs(1, investor1.address);
			});
		});

		describe("Failure", () => {
			it("rejects non-invester", async () => {
				await expect(dao.connect(user).vote(1)).to.be.reverted;
			});

			it("reject double voting", async () => {
				transaction = await dao.connect(investor1).vote(1);
				await transaction.wait();

				await expect(dao.connect(investor1).vote(1)).to.be.reverted;
			});

			//it("checks for quorum", async () => {});
		});
	});
});

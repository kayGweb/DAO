import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { ethers } from "ethers";

// Components
import Navigation from "./Navigation";
import Loading from "./Loading";
import Proposals from "./Proposals";
import Create from "./Create";

// ABIs: Import your contract ABIs here
//import TOKEN_ABI from "../abis/Token.json";
import DAO_ABI from "../abis/DAO.json";

// Config: Import your network config here
import config from "../config.json";

function App() {
	const [provider, setProvider] = useState(null);
	const [account, setAccount] = useState(null);
	const [dao, setDao] = useState(null);
	const [treasuryBalance, setTreasuryBalance] = useState(0);
	const [proposals, setProposals] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [quorum, setQuorum] = useState(null);

	const loadBlockchainData = async () => {
		// Initiate provider
		const provider = new ethers.providers.Web3Provider(window.ethereum);
		setProvider(provider);
		// initiate Contracts
		const dao = new ethers.Contract(config[31337].dao.address, DAO_ABI, provider);
		setDao(dao);

		// fetch Tresury balance
		let treasuryBalance = await provider.getBalance(dao.address);
		treasuryBalance = ethers.utils.formatEther(treasuryBalance, 18);
		setTreasuryBalance(treasuryBalance);
		console.log(treasuryBalance);

		// Fetch accounts
		const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
		const account = ethers.utils.getAddress(accounts[0]);
		setAccount(account);

		const count = await dao.proposalCount();
		const items = [];

		for (let i = 0; i < count.toNumber(); i++) {
			const proposal = await dao.proposals(i + 1);
			items.push(proposal);
		}

		// fetch Proposals
		setProposals(items);
		// fetch Quorum
		setQuorum(await dao.quorum());

		setIsLoading(false);
	};

	useEffect(() => {
		if (isLoading) {
			loadBlockchainData();
		}
	}, [isLoading]);

	return (
		<Container>
			<Navigation account={account} />

			<Create provider={provider} dao={dao} setIsLoading={setIsLoading} />

			<h1 className="my-4 text-center">Welcome to our DAO</h1>

			{isLoading ? (
				<Loading />
			) : (
				<>
					<hr />
					<p className="text-center">
						<strong>Treasury Balance </strong>
						{treasuryBalance} ETH
					</p>
					<hr />

					<Proposals provider={provider} dao={dao} proposals={proposals} quorum={quorum} setIsLoading={setIsLoading} />
				</>
			)}
		</Container>
	);
}

export default App;

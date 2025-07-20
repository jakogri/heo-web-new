import React, {Component} from 'react';
import config from "react-global-configuration";
import axios from 'axios';
import { Container, Row, Col, ProgressBar, Button, DropdownButton, Dropdown, Modal, Image, InputGroup, FormControl, FormLabel } from 'react-bootstrap';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle} from 'react-bootstrap-icons';
import ReactTextCollapse from 'react-text-collapse';
import ReactPlayer from 'react-player';
import { Link } from "react-router-dom";
import { Trans } from 'react-i18next';
import tron_abi from './TRC20';
import ethereum_abi from './ERC20';
import {
    i18nString,
    initWeb3,
    initWeb3Modal,
    clearWeb3Provider,
    clearTronProvider,
    initTronadapter,
    initTron
} from '../util/Utilities';
import i18n from '../util/i18n';
import { Editor, EditorState, convertFromRaw, CompositeDecorator } from "draft-js";
import '../css/campaignPage.css';
import '../css/modal.css';
import ReactGA from "react-ga4";
import bnbIcon from '../images/binance-coin-bnb-logo.png';
import busdIcon from '../images/binance-usd-busd-logo.png';
import usdcIcon from '../images/usd-coin-usdc-logo.png';
import ethIcon from '../images/eth-diamond-purple.png';
import cusdIcon from '../images/cusd-celo-logo.png';
import btcLogo from '../images/bitcoin-logo.png';
import daiLogo from '../images/dai-logo.png';
import ltcLogo from '../images/ltc-logo.png'
import visaMcLogo from '../images/visa-mc-logo.png';
import usdtLogo from '../images/usdt-logo.png';
import CCData from '../components/CCData';
//import TronWeb from "tronweb";

const IMG_MAP = {"BUSD": busdIcon,
    "BNB": bnbIcon,
    "USDС": usdcIcon,
    "USDT": usdtLogo,
    "ETH": ethIcon,
    "cUSD": cusdIcon,
};

const PAYMENT_ERROR_MESSAGES = {
    declined: "cardPaymentDeclined",
    payment_stopped_by_issuer: "cardPaymentFailed_payment_stopped_by_issuer",
    payment_fraud_detected: "cardPaymentFailed_payment_fraud_detected",
    payment_denied: "cardPaymentFailed_payment_denied",
    card_limit_violated: "cardPaymentFailed_card_limit_violated",
    card_invalid: "cardPaymentFailed_card_invalid",
    payment_not_funded: "cardPaymentFailed_payment_not_funded",
    payment_not_supported_by_issuer: "cardPaymentFailed_payment_not_supported_by_issuer",
    card_not_honored: "cardPaymentFailed_card_not_honored",
    thankyou: "thankYouDonation"
};

const TEXT_COLLAPSE_OPTIONS = {
    collapse: true, // default state when component rendered
    expandText:i18n.t('showLessTextCollapse'), // text to show when collapsed
    collapseText: i18n.t('showMoreTextExpand'), // text to show when expanded
    minHeight: 180,
    maxHeight: 350,
}
ReactGA.initialize("G-C657WZY5VT");
var HEOCampaign;

class CampaignPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editorState: EditorState.createEmpty(),
            donationAmount:"",
            campaign:{},
            campaignId: "",
            waitToClose:false,
            raisedAmount:0,
            showModal: false,
            showCoinbaseModal: false,
            modalMessage:"",
            modalTitle:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            chainId:"",
            campaign_wallets:[],           
            chain_addres:"",
            token_addres:"",
            chains:[],
            chains_coins:[],
            coins:[],
            ccinfo:{},
            showCCinfoModal: false,
            tryAgainCC: false,
            fiatPaymentEnabled: false,
            fiatPaymentProvider: '',
            recurringFiatPayments: false,
            cur_chain: -1,
            tipForHeo: 0
        };
        this.handleGetCCInfo = this.handleGetCCInfo.bind(this);
        this.handleCCInfoCancel = this.handleCCInfoCancel.bind(this);
        this.blockChainOrt = "";
    }

    async handleGetCCInfo(info) {
        this.setState({ccinfo : info});
        this.handleDonateFiat();
    }

    handleCCInfoCancel() {
        this.setState({showCCinfoModal : false});
    }

    handleDonationAmount = (e) => {
        let donationAmount = parseInt(e.target.value);
        let tipAmount = Math.max(1, parseInt(parseInt(donationAmount)/100 * this.state.tipForHeo));;
        this.setState({tipAmount: tipAmount, donationAmount: donationAmount, totalAmount: (donationAmount + tipAmount)});
    };

    handleTipAmount = (e) => {
        let tipAmount = parseInt(e.target.value);
        this.setState({tipAmount: tipAmount, totalAmount: (tipAmount + parseInt(this.state.donationAmount))});
    };

    handleRecurringAmount = (e) => {
        this.setState({recurringAmount: e.target.value});
    };

    getCurChaincCoins= (value) =>{
     for (let i = 0; i < this.state.chains_coins.length; i++){
        if (this.state.chains_coins._id === value){
            this.setState({cur_chain: i});
            return(i);
        }
     }
     this.setState({cur_chain: -1});
     return(-1);
    };

    async getCampaign(address) {
        var campaign = {};
        var modalMessage = 'failedToLoadCampaign';
        let data = {ID : address};
        await axios.post('/api/campaign/loadOne', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            campaign = res.data;
        }).catch(err => {
            if (err.response) {
                modalMessage = 'technicalDifficulties'}
            else if(err.request) {
                modalMessage = 'checkYourConnection'
            }
            console.log(err);
            this.setState({
                showError: true,
                modalMessage: modalMessage
            })
        })
        return campaign;
    }

    handleDonateCoinbaseCommerce = async () => {
        let data = {
            amount: this.state.totalAmount,
            tip: this.state.tipAmount,
            donation: this.state.donationAmount,        
            currency: "USD",
            campaignId: this.state.campaignId,
            campaignName: i18nString(this.state.campaign.title, i18n.language)
        };
        try {
            this.setState({
                showCCWarningModal:false,
                showModal: true, modalTitle: 'processingWait',
                modalMessage: "plzWait",
                errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
            });
            let resp = await axios.post('/api/donatecoinbasecommerce', data, {headers: {"Content-Type": "application/json"}});
            if(resp.data.paymentStatus === 'action_required') {
                this.setState({showModal: false});
                window.open(resp.data.redirectUrl, '_self');
            } else {
                this.setState({
                    showModal: true, modalTitle: 'failed', goHome: false,
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalMessage: "failedConnectCoinbaseCommerce",
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false
                });
            }
        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'failed', goHome: false,
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalMessage: err.response.data,
                modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false
            });
            return;
        }
    }

    handleDonateFiat = async () => {
        var data;
        if(this.state.fiatPaymentProvider === 'stripe') {
            data = {
                amount: this.state.totalAmount,
                tip: this.state.tipAmount,
                donation: this.state.donationAmount,
                currency: "EUR",
                campaignId: this.state.campaignId,
                campaignName: i18nString(this.state.campaign.title, i18n.language)
            };
        }
        try {
            this.setState({
                showCCWarningModal:false,
                showModal: true, modalTitle: 'processingWait', goHome: false,
                modalMessage: "plzWait",
                errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
            });
            let resp = await axios.post('/api/donatefiat', data, {headers: {"Content-Type": "application/json"}});
            if(resp.data.paymentStatus === 'action_required') {
                this.setState({showModal: false});
                window.open(resp.data.redirectUrl, '_self');
            } else if(resp.data.paymentStatus === "success") {
                this.setState({
                    showModal: true, modalTitle: 'complete', goHome: true,
                    modalMessage: 'thankYouFiatDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false, tryAgainCC: false, ccinfo: {}
                });
            } else {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: PAYMENT_ERROR_MESSAGES[resp.data.paymentStatus],
                    errorIcon: 'XCircle', modalButtonMessage: 'tryAgain', goHome: false,
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false
                });
                this.setState(prevState => ({
                    ccinfo: {
                        ...prevState.ccinfo,
                        ccError : PAYMENT_ERROR_MESSAGES[resp.data.paymentStatus]
                    }
                }));
            }
        } catch (err) {
            if (err.response.status === 503) {
                this.setState({
                    showModal: true, modalTitle: 'failed', goHome: false,
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalMessage: err.response.data,
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false
                });
                return;
            }
            console.log(err.response)
            this.setState({
                showModal: true, modalTitle: 'failed', goHome: false,
                errorIcon: 'XCircle', modalButtonMessage: 'tryAgain',
                modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: (this.state.fiatPaymentProvider !== 'stripe')
            });
        }
    }

    handleDonateRecurring = async () => {
        var data;
        if(this.state.fiatPaymentProvider === 'stripe') {
            data = {
                amount: this.state.totalAmount,
                tip: this.state.tipAmount,
                donation: this.state.donationAmount,                
                currency: "EUR",
                campaignId: this.state.campaignId,
                campaignName: i18nString(this.state.campaign.title, i18n.language)
            };
        }
        try {
            this.setState({
                showCCWarningModal:false, goHome: false,
                showModal: true, modalTitle: 'processingWait',
                modalMessage: "plzWait",
                errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
            });
            let resp = await axios.post('/api/donaterecurring', data, {headers: {"Content-Type": "application/json"}});
            if(resp.data.paymentStatus === 'action_required') {
                this.setState({showModal: false});
                window.open(resp.data.redirectUrl, '_self');
            } else if(resp.data.paymentStatus === "success") {
                this.setState({
                    showModal: true, modalTitle: 'complete', goHome: true,
                    modalMessage: 'thankYouFiatDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false, tryAgainCC: false, ccinfo: {}
                });
            } else {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: PAYMENT_ERROR_MESSAGES[resp.data.paymentStatus],
                    errorIcon: 'XCircle', modalButtonMessage: 'tryAgain', goHome: false,
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false
                });
                this.setState(prevState => ({
                    ccinfo: {
                        ...prevState.ccinfo,
                        ccError : PAYMENT_ERROR_MESSAGES[resp.data.paymentStatus]
                    }
                }));
            }
        } catch (err) {
            if (err.response.status === 503) {
                this.setState({
                    showModal: true, modalTitle: 'failed', goHome: false,
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalMessage: err.response.data,
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false
                });
                return;
            }
            console.log(err.response)
            this.setState({
                showModal: true, modalTitle: 'failed', goHome: false,
                errorIcon: 'XCircle', modalButtonMessage: 'tryAgain',
            })
        }
    }

    showCoinbaseCommerce = async() => {
        this.setState({showCoinbaseModal: true});
    }

    saveDonateToDb = async (transactionHash, chainId, coinAddress, blockChainOrt) => {
        let accounts = this.state.accounts;
        let donateData
        if (blockChainOrt === "ethereum"){
            donateData = {
                campaignID : this.state.campaignId,
                donatorID: accounts[0],
                raisedAmount: this.state.donationAmount,
                tipAmount: this.state.tipAmount,
                transactionHash: transactionHash,
                chainId: chainId,
                blockChainOrt: "Ethereum",
                coinAddress: coinAddress
              };
        } else if (blockChainOrt === "tron"){
            donateData = {
                campaignID : this.state.campaignId,
                donatorID: window.tronAdapter.address,
                raisedAmount: this.state.donationAmount,
                tipAmount: this.state.tipAmount,
                transactionHash: transactionHash,
                chainId: chainId,
                blockChainOrt: "Tron",
                coinAddress: coinAddress
              };
        }
        let res = await axios.post('/api/donate/adddanate', {mydata: donateData}, {headers: {"Content-Type": "application/json"}});
        //if (res.data === "success")
        this.setState({showModal:true, goHome: true,
            modalMessage: 'thankYouDonation',
            modalTitle: 'complete',
            modalIcon: 'CheckCircle',
            modalButtonMessage: 'returnHome',
            modalButtonVariant: "#588157", waitToClose: false
        });
        this.setState({raisedAmount: this.state.raisedAmount + this.state.donationAmount});
        if (res.data !== "success"){
            let dataEmail ={key: 'Donations not preserved in the database', text:`Donation options: campaignID - ${this.state.campaignId};
            blockChainOrt - ${this.blockChainOrt}; raisedAmount - ${this.state.donationAmount}; tipAmount - ${this.state.tipAmount};
            transactionHash - ${transactionHash}; chainId - ${chainId}; coinAddress - ${coinAddress};donatorID - ${donateData.donatorID}`} 
            axios.post('/api/sendemail', dataEmail, {headers: {"Content-Type": "application/json"}}); 
        }
    }
    
    handleDonateClick = async(wallet_ort, addres_base58, addres_hex, coin_addres, chain_name, coin_name) =>{
      if(wallet_ort === "Ethereum"){
        this.blockChainOrt = "ethereum";
        //if (this.state.campaign.new === false) await this.handleDonateOld(chain_name, addres_hex);
       await this.handleDonateNew(chain_name, addres_hex, coin_addres, coin_name);
      }
      else if(wallet_ort === "Tron"){
        this.blockChainOrt = "tron";
        await this.handleDonateTron(chain_name, addres_base58, coin_addres, coin_name);
      }
    }

    Sleep = async(time) => {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    handleDonateTron = async (chainId, addres_base58, coinAddress, coin_name) =>{
        try{
            await clearTronProvider();
            await initTronadapter();
            await initTron(chainId, coin_name);
            var toDonate = window.tronWeb.toSun(this.state.totalAmount);
            var coinInstance = await window.tronWeb.contract(tron_abi, coinAddress);
            ReactGA.event({
                category: "donation",
                action: "donate_button_click",
                value: parseInt(this.state.totalAmount), // optional, must be a number
                nonInteraction: false
            });
            //check if donating to oneself
            if(window.tronAdapter.address.toLowerCase() === addres_base58.toLowerCase()) {
                this.setState({
                    showModal: true, modalTitle: 'notAllowed', goHome: false,
                    modalMessage: 'donateToYourSelf',
                    errorIcon: 'ExclamationTriangle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
                ReactGA.event({
                    category: "donation",
                    action: "self_donation_blocked",
                    nonInteraction: false
                });
                console.log("Tronadapter address" + window.tronAdapter.address);
                return;
            }
            let result = await coinInstance.methods.transfer(addres_base58, toDonate)
            .send({from:window.tronAdapter.address,callValue:0,feeLimit:15000000000,shouldPollResponse:false});
            
            this.setState({showModal:true,
                modalTitle: 'processingWait', goHome: false,
                modalMessage: 'waitingForNetwork', errorIcon:'HourglassSplit',
                modalButtonVariant: "gold", waitToClose: true});
            let txnObject;
            let m = 1;
            do{
                console.log("Waiting for transaction record");
                txnObject = await window.tronWeb.trx.getUnconfirmedTransactionInfo(result);
                if(txnObject){
                  if (txnObject.receipt)  break;
                }
                await this.Sleep(1000);
            }while(m !== 2);
            if (txnObject.receipt.result === "SUCCESS"){
               this.setState({
                   showModal: true, modalTitle: 'complete', goHome: true,
                   modalMessage: 'thankYouDonation',
                   errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                   modalButtonVariant: '#588157', waitToClose: false
                });
                this.saveDonateToDb(txnObject.id, chainId, coinAddress, "tron");

            }else {
                this.setState({
                    showModal: true, modalTitle: 'failed', goHome: false,
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false,
                    modalMessage: 'blockChainTransactionFailed'
                });
                ReactGA.event({
                    category: "error",
                    action: "transaction_error",
                    label: `Tronlink transaction failed`,
                    nonInteraction: false
                });
            }
        } catch (err) {
            this.setState({
              showModal: true, modalTitle: 'failed', goHome: false,
              errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
              modalButtonVariant: '#E63C36', waitToClose: false,
              modalMessage: 'blockChainTransactionFailed'
            });
            ReactGA.event({
              category: "error",
              action: "transaction_error",
              label: (err && err.message ? err.message : "blockChainTransactionFailed"), // optional, must be a number
              nonInteraction: false
            });
            clearWeb3Provider(this);
            console.log(err);
        }
    }

    //handleDonateNew = async (chainId, coinAddress) => {
    handleDonateNew =  async (chain_name, addres_hex, coin_addres, coin_name) => {    
        //TODO: check that this.state.donationAmount is larger than
        try {
            await clearWeb3Provider(this);
            await initWeb3Modal(chain_name);
            await initWeb3(chain_name, this);
            let web3 = this.state.web3;
            let accounts = this.state.accounts;
            let currentProvider = "";
            if(web3.currentProvider && web3.currentProvider.isMetaMask) {
                currentProvider = "metamask";
            } else if(web3.currentProvider && web3.currentProvider.isWalletConnect) {
                currentProvider = "walletconnect";
            }
            let toDonate = web3.utils.toWei(""+this.state.donationAmount);
            var coinInstance = new web3.eth.Contract(ethereum_abi, coin_addres);
            ReactGA.event({
                category: "donation",
                action: "donate_button_click",
                value: parseInt(this.state.donationAmount), // optional, must be a number
                nonInteraction: false
            });
            //check if donating to oneself
            if(accounts[0].toLowerCase() === addres_hex.toLowerCase()) {
                this.setState({
                    showModal: true, modalTitle: 'notAllowed',
                    modalMessage: 'donateToYourSelf',
                    errorIcon: 'ExclamationTriangle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
                ReactGA.event({
                    category: "donation",
                    action: "self_donation_blocked",
                    nonInteraction: false
                });
                return;
            }

            var that = this;
            //for native donations
          
            
                //for ERC20 donations
                

                this.setState({
                    showModal: true, modalTitle: 'processingWait', goHome: false,
                    modalMessage: "approveSpend",
                    errorIcon: 'HourglassSplit', modalButtonVariant: "#E63C36", waitToClose: false,
                    modalButtonMessage: 'abortBtn',
                });

                try {
                    let decimals = 6;
                    toDonate = new web3.utils.BN(""+this.state.totalAmount).mul(new web3.utils.BN("1000000"));
                    if(currentProvider !== "metamask") {
                        ReactGA.event({
                            category: "provider",
                            action: "using_noninjected_provider",
                            label: window.web3Modal.cachedProvider,
                            nonInteraction: false
                        });
                        // Binance Chain Extension Wallet does not support network events
                        // so we have to poll for transaction status instead of using
                        // event listeners and promises.
                        console.log(`Using provider ${currentProvider}`);
                        coinInstance.methods.decimals().call({from:accounts[0]}, function(err, result) {
                            if(err) {
                                console.log(`Failed to fetch decimals from ${coin_addres} `);
                                console.log(err);
                            } else {
                                decimals = result;
                                console.log(`${coin_addres} has ${result} decimals`);
                                toDonate = new web3.utils.BN(""+that.state.donationAmount).mul(new web3.utils.BN(new web3.utils.BN("10").pow(new web3.utils.BN(""+decimals))));
                                console.log(`Adjusted donation amount is ${toDonate.toString()}`);
                            }
                            coinInstance.methods.transfer(addres_hex, toDonate).send(
                                {from:accounts[0]}
                            ).once('transactionHash', function(transactionHash) {
                                console.log(`Got donation trnasaction hash ${transactionHash}`);
                                that.saveDonateToDb(transactionHash, chain_name, coin_addres, "ethereum");
                                ReactGA.event({
                                    category: "donation",
                                    action: "donation_hash",
                                    label: transactionHash, // optional, must be a number
                                    nonInteraction: false
                                });
                                web3.eth.getTransaction(transactionHash).then(
                                    function(txnObject2) {
                                        if(txnObject2) {
                                            checkDonationTransaction(txnObject2, decimals, chain_name, that);
                                        } else {
                                            console.log(`Empty txnObject2. Using transaction hash to check donation status.`);
                                            checkDonationTransaction({hash:transactionHash}, decimals, chain_name, that);
                                        }
                                    }
                                );
                            }).on('error', function(error) {
                                ReactGA.event({
                                    category: "donation",
                                    action: "donation_failed",
                                    label: error, // optional, must be a number
                                    nonInteraction: false
                                });
                                that.setState({
                                    showModal: true, modalTitle: 'failed', goHome: false,
                                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                                    modalButtonVariant: '#E63C36', waitToClose: false,
                                    modalMessage: 'blockChainTransactionFailed'
                                });
                                clearWeb3Provider(that)
                                console.log(error);
                            })

                        });
                    } else {
                        console.log(`Using provider ${currentProvider}`);
                        ReactGA.event({
                            category: "provider",
                            action: "using_injected_provider",
                            label: window.web3Modal.cachedProvider, // optional, must be a number
                            nonInteraction: false
                        });
                        decimals = await coinInstance.methods.decimals().call();

                        toDonate = new web3.utils.BN(""+that.state.totalAmount).mul(new web3.utils.BN(new web3.utils.BN("10").pow(new web3.utils.BN(""+decimals))));
                        let result = await coinInstance.methods.transfer(addres_hex, toDonate).send(
                            {from:accounts[0]}
                        ).once('transactionHash', function(transactionHash) {
                            console.log(`transaction hash for donateERC20 ${transactionHash}`);
                            that.setState({modalMessage: "waitingForNetwork"});
                            that.saveDonateToDb(transactionHash, chain_name, addres_hex, "ethereum");
                        });
                        if(result.code) {
                            this.setState({
                                showModal: true, modalTitle: 'failed',  goHome: false,
                                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                                modalButtonVariant: '#E63C36', waitToClose: false,
                                modalMessage: 'blockChainTransactionFailed'
                            });
                            ReactGA.event({
                                category: "error",
                                action: "transaction_error",
                                label: `Metamask transaction failed with code ${result.code}`,
                                nonInteraction: false
                            });
                            clearWeb3Provider(this);
                            return;
                        }
                        this.setState({
                            showModal: true, modalTitle: 'complete', goHome: true, 
                            modalMessage: 'thankYouDonation',
                            errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                            modalButtonVariant: '#588157', waitToClose: false
                        });


                    }
                } catch (err) {
                    this.setState({
                        showModal: true, modalTitle: 'failed',  goHome: false,
                        errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: '#E63C36', waitToClose: false,
                        modalMessage: 'blockChainTransactionFailed'
                    });
                    ReactGA.event({
                        category: "error",
                        action: "transaction_error",
                        label: (err && err.message ? err.message : "blockChainTransactionFailed"), // optional, must be a number
                        nonInteraction: false
                    });
                    clearWeb3Provider(this);
                    console.log(err);
                }
            
        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'failed', goHome: false,
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainConnectFailed'
            });
            ReactGA.event({
                category: "error",
                action: "transaction_error",
                label: (err && err.message ? err.message : "blockChainConnectFailed"), // optional, must be a number
                nonInteraction: false
            });
        }
    }

    onModalClose() {
        if(this.state.tryAgainCC) {
            this.setState({showCCinfoModal:true});
        }
    }

    render() {
        return (
            <div>
                <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' size="md" centered>
                    <Modal.Body><p className='errorIcon'>
                        {this.state.errorIcon === 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.errorIcon === 'ExclamationTriangle' && <ExclamationTriangle style={{color: '#E63C36'}}/>}
                        {this.state.errorIcon === 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.errorIcon === 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle} /></p>
                        <p className='modalMessage'>
                            <Trans i18nKey={this.state.modalMessage}
                                   values={{donationAmount: this.state.donationAmount, currencyName: this.state.campaign.currencyName }} />

                        </p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton'
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ () => {
                                    this.onModalClose();
                                    this.setState({showModal: false, onModalClose: false});
                                    ReactGA.event({
                                        category: "button_click",
                                        action: "modal_closed",
                                        label: this.state.modalTitle, // optional, must be a number
                                        nonInteraction: false
                                    });
                                    if(this.state.goHome) this.props.history.push('/');
                                }
                            }>
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>
                </Modal>
                <Modal show={this.state.showCCWarningModal} onHide={()=>{}} className='myModal' size="lg"
                       aria-labelledby="contained-modal-title-vcenter" >
                    <Modal.Body>
                        <ReactTextCollapse options={TEXT_COLLAPSE_OPTIONS} >
                        <p style={{textAlign: 'left'}}><Trans i18nKey='fiatDonationPrompt' />
                            <br/>
                            <Trans i18nKey='fiatDonationLimitationPrompt' />
                            <ul>
                                <li><Trans i18nKey='fiatDonationLimitation1' /></li>

                                <li><Trans i18nKey='fiatDonationLimitation2' /></li>

                                    <li><Trans i18nKey='fiatDonationLimitation3' /></li>
                            </ul>
                        </p>
                        </ReactTextCollapse>
                        <Button variant="danger" id='donateBtn'  onClick={
                            () => {
                                if(this.state.fiatPaymentProvider ==='payadmit') {
                                    //skip the card info form for PayAdmin and use hosted payment dialog
                                    this.setState({showCCinfoModal: false});
                                    this.handleDonateFiat();
                                } else {
                                    //for Cirle use our payment dialog
                                    this.setState({showCCinfoModal: true});
                                }
                            }
                        }><Trans i18nKey='donate'/></Button>
                    </Modal.Body>
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <Link className={"backToCampaignsLink"} to="/"><span><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToCampaigns'/></span></Link>
                </Container>
                <Container id='mainContainer'>
                    {this.state.showCCinfoModal && <CCData handleCCInfoCancel = {this.handleCCInfoCancel} handleGetCCInfo = {this.handleGetCCInfo} currentCCInfo = {this.state.ccinfo}/>}
                    <Row id='topRow'>
                        <Col id='imgCol'>
                            <Image src={this.state.campaign.mainImageURL} id='mainImage'/>
                        </Col>
                        <Col id='infoCol'>
                            <Row id='titleRow'>
                                <p id='title'>{i18nString(this.state.campaign.title, i18n.language)}</p>
                            </Row>
                            <Row id='countryRow'><h2>{i18nString(this.state.campaign.org, i18n.language)}</h2></Row>
                            <Row id='progressRow'>
                                <p id='progressBarLabel'><span id='progressBarLabelStart'>&#36;{`${this.state.raisedAmount}`}</span>{i18n.t('raised')}&#36;{this.state.campaign.maxAmount} {i18n.t('goal')}</p>
                                <ProgressBar id='progressBar' now={100 * this.state.raisedAmount/this.state.campaign.maxAmount}/>
                            </Row>
                            <Row id='acceptingRow'>
                                <div id='acceptingDiv'>
                                    <p><Trans i18nKey='accepting'/>:
                                        {this.state.fiatPaymentEnabled && this.state.campaign.fiatPayments && <span className='coinRewardInfo'><img src={visaMcLogo} witdth={21} height={20} alt='some value' style={{marginRight:5, marginLeft:5}} /> </span> }
                                        {this.state.chains_coins.map((item, i) =>
                                            <span className='coinRewardInfo'><img src={IMG_MAP[item.coin.name]} width={20} height={20}alt='some value'style={{marginRight:5, marginLeft:5}} /> </span>
                                            )}
                                        {<span className='coinRewardInfo'><img src={ethIcon} width={20} height={20} alt='some value' style={{marginRight:5, marginLeft:5}} /> </span> }
                                        {<span className='coinRewardInfo'><img src={btcLogo} width={20} height={20} alt='some value' style={{marginRight:5, marginLeft:5}} /> </span> }
                                        {<span className='coinRewardInfo'><img src={daiLogo} width={20} height={20} alt='some value' style={{marginRight:5, marginLeft:5}} /> </span> }
                                        {<span className='coinRewardInfo'><img src={usdcIcon} width={20} height={20} alt='some value' style={{marginRight:5, marginLeft:5}} /> </span> }
                                        {<span className='coinRewardInfo'><img src={usdtLogo} width={20} height={20} alt='some value' style={{marginRight:5, marginLeft:5}} /> </span> }
                                        {<span className='coinRewardInfo'><img src={ltcLogo} width={20} height={20} alt='some value' style={{marginRight:5, marginLeft:5}} /> </span> }
                                    </p>
                                </div>
                            </Row>
                            <Row id='donateRow'>
                                <InputGroup className="mb-3">
                                    <FormLabel htmlFor="donateAmount"><Trans i18nKey='donation_label' /></FormLabel><FormControl
                                        id='donateAmount'
                                        value={this.state.donationAmount}
                                        onChange={this.handleDonationAmount}
                                        type="number"
                                    />
                                    <FormLabel htmlFor="tipAmount"><Trans i18nKey='tip_label' /></FormLabel><FormControl
                                        id='tipAmount'
                                        value={this.state.tipAmount}
                                        onChange={this.handleTipAmount}
                                        type="number"
                                    />
                                    <FormLabel htmlFor="totalAmount"><Trans i18nKey='total_amount_label' /></FormLabel><FormControl
                                        id='totalAmount'
                                        value={this.state.totalAmount}
                                        readOnly="true"
                                        type="number"
                                    />
                                 </InputGroup>
                            </Row>
                            <Row id='donateButtonsRow'>
                                    <InputGroup className="mb-3">
                                        <DropdownButton id='donateButton' title={i18n.t('donate_once')}>
                                            {this.state.fiatPaymentEnabled && this.state.campaign.fiatPayments && <Dropdown.Item key="_fiat" as="button" onClick={
                                            () => {
                                                if(this.state.fiatPaymentProvider ==='stripe') {
                                                    //skip the card info form for PayAdmin and use hosted payment dialog
                                                    this.handleDonateFiat();
                                                } else if(this.state.fiatPaymentProvider ==='payadmit') {
                                                    //skip the card info form for PayAdmin and use hosted payment dialog
                                                    this.setState({showCCinfoModal: false});
                                                    this.setState({showCCWarningModal: true});
                                                } else if(this.state.fiatPaymentProvider ==='circle') {
                                                    //for Cirle use our payment dialog
                                                    this.setState({showCCWarningModal: false});
                                                    this.setState({showCCinfoModal: true});
                                                }
                                            }
                                            }><img src={visaMcLogo} width={17} height={16} alt='some value' style={{marginRight:5}} />USD</Dropdown.Item> }
                                             {this.state.campaign_wallets.map((item, i) =>
                                                    
                                                    <Dropdown.Item key={item.wallet_ort} as="button" onClick={() => 
                                                      this.handleDonateClick(item.wallet_ort, item.addres_base58, item.addres_hex,item.coin_addres,item.chainId,item.coin_name)}>
                                                      <img src={IMG_MAP[item.coin_name]} width={16} height={16} alt='some value' style={{marginRight:5}} />{item.coin_name} 
                                                    </Dropdown.Item>
                                                )}
                                        </DropdownButton>
                                        {this.state.fiatPaymentEnabled && this.state.campaign.fiatPayments && this.state.campaign.recurringFiatPayments &&
                                        <Button id='recurringButton' onClick={
                                                () => {
                                                    this.handleDonateRecurring();
                                                }
                                            }><Trans i18nKey='donate_monthly'/></Button>
                                        }
                                </InputGroup>
                            </Row>
                        </Col>
                    </Row>
                    <Row id='videoRow'>
                        <Container id='videoRowContainer'>
                            { this.state.campaign.vl && <ReactPlayer controls={true} url={this.state.campaign.vl} id='videoPlayer' />}
                        </Container>
                    </Row>
                    <Row id='descriptionRow'>
                        <Container>
                            <Editor editorState={this.state.editorState} readOnly={true} decorators={true}/>
                        </Container>
                    </Row>
                    {this.state.campaign.qrCodeImageURL &&
                    <Row>
                        <Image src={this.state.campaign.qrCodeImageURL} id='qrCodeImg'/>
                    </Row>
                    }
                </Container>
            </div>
        );
    }

    async checkAutorisation(){
        let result = await axios.post('/api/is_autorisation', {headers: {"Content-Type": "application/json"}});
        if (result.data !== false) return true;
        else return false;
    }

    async componentDidMount() {
        let connected = await this.checkAutorisation();
        if (connected === false){
            this.setState({showModal:true, modalButtonVariant: "#E63C36",
            modalTitle:"attention", modalMessage: "noLogMessage1", modalButtonMessage:"ok",
            modalIcon: "ExclamationTriangle", goHome: true });  
            return; 
        }
        window.scrollTo(0,0);
        var modalMessage = 'failedToLoadCampaign';
        let toks = this.props.location.pathname.split("/");
        let key = toks[toks.length -1];
        let data = {KEY : key};
        var campaignId;
        await axios.post('/api/campaign/getid', data, {headers: {"Content-Type": "application/json"}})
            .then(res => {
                campaignId = res.data;
            }).catch(err => {
                if (err.response) {
                    modalMessage = 'technicalDifficulties'}
                else if(err.request) {
                    modalMessage = 'checkYourConnection'
                }
                console.log(err);
                this.setState({
                    showError: true,
                    modalMessage: modalMessage
                })
            })
        let campaign = await this.getCampaign(campaignId);
        if(!campaign) {
            this.props.history.push("/404");
            return;
        }
        this.state.campaign_wallets = campaign.campaign_wallets;
        let result = await axios.post('/api/gettipforheo', {headers: {"Content-Type": "application/json"}});
        if(result) {
            this.state.tipForHeo = Number(result.data);
        }
        this.state.donationAmount = campaign.defaultDonationAmount ? campaign.defaultDonationAmount : 20;
        this.state.tipAmount = Math.max(1, parseInt(parseInt(this.state.donationAmount)/100 * this.state.tipForHeo));
        this.state.totalAmount = parseInt(campaign.defaultDonationAmount) + this.state.tipAmount;
        let totalQuantity = campaign.totalQuantity? parseFloat(campaign.totalQuantity) : 0;
        let raisedAmount = campaign.raisedAmount? parseFloat(campaign.raisedAmount) : 0;
        let fiatDonations = campaign.fiatDonations ? parseFloat(campaign.fiatDonations) : 0;
        let raisedOnCoinbase = campaign.raisedOnCoinbase ? parseFloat(campaign.raisedOnCoinbase) : 0;
        raisedAmount = Math.round((raisedAmount + fiatDonations + raisedOnCoinbase + totalQuantity) * 100)/100;
        this.state.raisedAmount = raisedAmount;
        campaign.percentRaised = 100 * (this.state.raisedAmount)/campaign.maxAmount;
        var contentState = {};
        var lng
        if(campaign.descriptionEditor[i18n.language]) {
            for(lng in campaign.descriptionEditor) {
                contentState[lng] = convertFromRaw(campaign.descriptionEditor[lng]);
            }
        } else if(campaign.descriptionEditor["default"]) {
            for(lng in campaign.descriptionEditor) {
                contentState[lng] = convertFromRaw(campaign.descriptionEditor[lng]);
            }
            contentState[i18n.language] = convertFromRaw(campaign.descriptionEditor["default"]);
        } else {
            contentState[i18n.language] = convertFromRaw(campaign.descriptionEditor);
        }
        this.state.editorState = EditorState.createWithContent(contentState[i18n.language], createDecorator());
        var that = this;
        i18n.on('languageChanged', function(lng) {
            if(contentState[lng]) {
                that.setState({
                    editorState: EditorState.createWithContent(contentState[lng], createDecorator())
                })
            }
        })
        let chains = [];
        let configChains = config.get("CHAINS");
        for(var ch in campaign.addresses) {
            if(configChains[ch]) {
                chains.push(configChains[ch]);
            }
        }
        let globals = config.get("GLOBALS");
        globals.forEach(element => {
            if(element._id === 'FIATPAYMENT') {
                if(campaign.fiatPayments) {
                    this.setState({fiatPaymentEnabled: element.enabled});
                    if(campaign.recurringFiatPayments) {
                        this.setState({recurringFiatPaymentEnabled: element.enabled});
                    } else {
                        this.setState({recurringFiatPaymentEnabled: false})
                    }
                } else {
                    this.setState({fiatPaymentEnabled: false});
                }

                if(element.enabled) {
                    if(element.STRIPE) {
                        this.setState(({
                            fiatPaymentProvider: 'stripe'
                        }));
                    } else if(element.CIRCLE) {
                        this.setState(({
                            fiatPaymentProvider: 'circle'
                        }));
                    } else if (element.PAYADMIT) {
                        this.setState(({
                            fiatPaymentProvider: 'payadmit'
                        }));
                    }
                }
            }
        });

        //dedupe coin names for "accepting" section
        let dedupedCoinNames = [];
        for(var coin in campaign.coins) {
            let coinName = campaign.coins[coin].name;
            if(!dedupedCoinNames.includes(coinName)) {
                dedupedCoinNames.push(coinName);
            }
        }
        
        await axios.post('/api/getcoinslist')
        .then(res => {
            let chains_coins = [];
            for (let i = 0; i <  res.data.length; i++){
                res.data[i].chain_name = "";
                if(campaign.addresses[res.data[i].chain])
                {
                    for (let j = 0; j < chains.length; j++){
                     if (chains[j].CHAIN === res.data[i].chain){
                        res.data[i].chain_name = chains[j].CHAIN_NAME;
                        break;
                     }
                    }
                    chains_coins.push(res.data[i]);
                }
            }
            this.setState({chains_coins:chains_coins})
        }).catch(err => {
            if (err.response) {
                modalMessage = 'Failed to load coins. We are having technical difficulties'}
            else if(err.request) {
                modalMessage = 'Failed to load coins. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                modalMessage: modalMessage
            })
        })
        this.setState({
            chains: chains,
            campaignId: campaignId,
            campaign : campaign,
            coins: dedupedCoinNames
        });
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });

        if(params.fp) {
            if(params.fp === 's') {
                this.setState({
                    showModal: true, modalTitle: 'complete',  goHome: true,
                    modalMessage: 'thankYouFiatDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false, tryAgainCC: false, ccinfo: {}
                });
            } else if(params.fp === 'f') {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: 'failed3ds',
                    errorIcon: 'XCircle', modalButtonMessage: 'tryAgain', goHome: false,
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: true,
                    donationAmount: params.am
                });
            } else if(params.fp === 'pa' && params.state) {
                if(params.state ==='declined' || params.state==='cancelled') {
                    this.setState({
                        showModal: true, modalTitle: 'failed', modalMessage: 'cardPaymentDeclined',
                        errorIcon: 'XCircle', modalButtonMessage: 'tryAgain', goHome: false,
                        modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false,
                        donationAmount: params.am,  ccinfo: {}
                    });
                } else {
                    this.setState({
                        showModal: true, modalTitle: 'complete', goHome: true,
                        modalMessage: 'thankYouFiatDonation',
                        errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: '#588157', waitToClose: false, tryAgainCC: false, ccinfo: {}
                    });
                }
            }
        }
    }
}

function createDecorator() {
    const decorator = new CompositeDecorator([
        {
          strategy: findLinkEntities,
          component: editorLink,
        },
    ]);

    return decorator;
}

function findLinkEntities(contentBlock, callback, contentState) {
    contentBlock.findEntityRanges(
      (character) => {
        const entityKey = character.getEntity();
        return (
          entityKey !== null &&
          contentState.getEntity(entityKey).getType() === 'LINK'
        );
      },
      callback
    );
  }

  const editorLink = (props) => {
    const {url} = props.contentState.getEntity(props.entityKey).getData();
    return (
      <a href={url} rel="noopener noreferrer" target='_blank'>
        {props.children}
      </a>
    );
  };

function checkDonationTransaction(txnObject, decimals, chainId, that) {
    if(txnObject.blockNumber) {
        console.log(`Donation transaction successful in block ${txnObject.blockNumber}`);
        that.setState({
            showModal: true, modalTitle: 'complete',
            modalMessage: 'thankYouDonation',
            errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
            modalButtonVariant: '#588157', waitToClose: false
        });
        ReactGA.event({
            category: "donation",
            action: "donation_succeeded",
            value: parseInt(that.state.donationAmount), // optional, must be a number
            nonInteraction: false
        });
    } else {
        that.state.web3.eth.getTransaction(txnObject.hash).then(function(txnObject2) {
            if(txnObject2) {
                setTimeout(checkDonationTransaction, 3000, txnObject2, decimals, chainId, that);
            } else {
                console.log(`Empty txnObject2. Using transaction hash to check status.`);
                setTimeout(checkDonationTransaction, 3000, {hash:txnObject.hash}, decimals, chainId, that);
            }
        });
    }
}


export default CampaignPage;

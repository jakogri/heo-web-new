import React, {Component} from 'react';
import config from "react-global-configuration";
import axios from 'axios';
import { Container, Row, Col, ProgressBar, Button, DropdownButton, Dropdown, Modal, Image, InputGroup } from 'react-bootstrap';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle} from 'react-bootstrap-icons';
import ReactPlayer from 'react-player';
import { Link } from "react-router-dom";
import { Trans } from 'react-i18next';
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
import CCData from '../components/CCData';
ReactGA.initialize("G-C657WZY5VT");
var HEOCampaign, ERC20Coin;

class WithdrawDonations extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editorState: EditorState.createEmpty(),
            campaign:{},
            campaignId: "",
            waitToClose:false,
            raisedAmount:0,
            showModal: false,
            modalMessage:"",
            modalTitle:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            chainId:"",
            chains:[],
            chains_coins:[],
            coins:[],
            ccinfo:{},
            showCCinfoModal: false,
            tryAgainCC: false,
            fiatPaymentEnabled: false,
            fiatPaymentProvider: ''

        };
        this.handleGetCCInfo = this.handleGetCCInfo.bind(this);
        this.handleCCInfoCancel = this.handleCCInfoCancel.bind(this);
    }
    async handleGetCCInfo(info) {
        await this.setState({ccinfo : info});
        this.handleDonateFiat();
    }
    handleCCInfoCancel() {
        this.setState({showCCinfoModal : false});
    }

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
        return(campaign);
    }

    updateRaisedAmount = async () => {
        let data = {campaignID : this.state.campaignId};
        var donateAmount;
        var modalMessage;
        await axios.post('/api/campaign/getalldonations', {mydata: data}, {headers: {"Content-Type": "application/json"}})
            .then(res => {
                donateAmount = (res.data === 0) ? 0 : parseFloat(res.data[0].totalQuantity);
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
            let baseAmount = this.state.campaign.raisedAmount ? parseFloat(this.state.campaign.raisedAmount) : 0;
            let fiatDonations = this.state.campaign.fiatDonations ? parseFloat(this.state.campaign.fiatDonations) : 0;
            let raisedOnCoinbase = this.state.campaign.raisedOnCoinbase ? parseFloat(this.state.campaign.raisedOnCoinbase) : 0;
            if(baseAmount || fiatDonations || raisedOnCoinbase || donateAmount) {
                let raisedAmount = Math.round((baseAmount + fiatDonations + raisedOnCoinbase + donateAmount) * 100)/100;
                this.setState({raisedAmount : raisedAmount});
            }
    }


    onModalClose() {
        if(this.state.tryAgainCC) {
            this.setState({showCCinfoModal:true});
        }
    }

    getDaonateSizeTron = async (chainId, campaign, coinAddress) =>{
        try{
            await clearTronProvider();
            await initTronadapter();
            await initTron(chainId, this);
            let TRC20Coin = (await import("../remote/"+ chainId + "/TRC20")).default;
            let campaignAddress = campaign.addresses[chainId];
            let userCoinInstance = await window.tronWeb.contract(TRC20Coin, window.tronWeb.address.fromHex(coinAddress));
            let campaignBalance = await userCoinInstance.methods.balanceOf(campaignAddress).call();
            let decimals = await userCoinInstance.methods.decimals().call();
            campaignBalance = window.tronWeb.toDecimal(campaignBalance);
            return(campaignBalance/(10**decimals));
        }
      catch (err) {
              console.log(err);
              this.setState({
                  showModal: true, modalTitle: 'failed',
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
              return (0);
          }
      }

    getDaonateSize = async (chainId, campaign, coinAddress) =>{
      try{
          await clearWeb3Provider(this);
          await initWeb3Modal(chainId);
          await initWeb3(chainId, this);
          let web3 = this.state.web3;
          HEOCampaign = (await import("../remote/"+ chainId + "/HEOCampaign")).default;
          ERC20Coin = (await import("../remote/"+ chainId + "/ERC20")).default;
          let campaignAddress = campaign.addresses[chainId];
          let userCoinInstance = new web3.eth.Contract(ERC20Coin, coinAddress);
          let campaignBalance = await userCoinInstance.methods.balanceOf(campaignAddress).call();
          let decimals = await userCoinInstance.methods.decimals().call();
          return(campaignBalance/(10**decimals));
      }
    catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'failed',
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
            return (0);
        }
    }

    handleDonateClick = async (chainId, coin_adres, blockChainOrt) => {
        if(blockChainOrt === "ethereum"){
            window.blockChainOrt = "ethereum";
           this.handleDonateClickEthereum(chainId, coin_adres);

        } else if (blockChainOrt === "tron"){
            window.blockChainOrt = "tron";
            this.handleDonateClickTron(chainId, coin_adres);
        }
    }

    handleDonateClickTron = async (chainId, coin_adres) => {
        try{
            await clearTronProvider();
            await initTronadapter();
            await initTron(chainId, this);
            var chains_coins = this.state.chains_coins;
            HEOCampaign = (await import("../remote/"+ chainId + "/HEOCampaign")).default;
            let TRC20Coin = (await import("../remote/"+ chainId + "/TRC20")).default;
            let campaignAddress = this.state.campaign.addresses[chainId];
            let campaignInstance = await window.tronWeb.contract(HEOCampaign, window.tronWeb.address.fromHex(campaignAddress));
            let userCoinInstance = await window.tronWeb.contract(TRC20Coin, window.tronWeb.address.fromHex(coin_adres));
            let campaignBalance = await userCoinInstance.methods.balanceOf(campaignAddress).call();
            ReactGA.event({
                category: "donation",
                action: "donate_button_click",
                value: parseInt(campaignBalance), // optional, must be a number
                nonInteraction: false
            });

            try {
                let result = await campaignInstance.methods.donateToBeneficiary(coin_adres)
                .send({from:window.tronAdapter.address,callValue:0,feeLimit:15000000000,shouldPollResponse:false});
                this.setState({showModal:true,
                    modalMessage: 'waitingForNetwork', errorIcon:'HourglassSplit',
                    modalButtonVariant: "gold", waitToClose: true});
                    let txnObject;
                let m = 1;
                do{
                    console.log("Waiting for transaction record");
                    txnObject = await window.tronWeb.trx.getTransactionInfo(result);
                    if(txnObject){
                      if (txnObject.receipt)  break;
                    }
                }while(m !== 2);

                if (txnObject.receipt.result !== "SUCCESS"){
                    this.setState({
                        showModal: true, modalTitle: 'failed',
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
                   return;
                }
                for (let j = 0; j < chains_coins.length; j++){
                    if ((chains_coins.chain === chainId)&&(chains_coins.coin.address === coin_adres)){
                        chains_coins.donate = await this.getDaonateSizeTron(chainId, this.state.campaignId, coin_adres);
                        break;
                    }
                }
                this.setState({chains_coins:chains_coins});
            } catch (err) {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: 'blockChainTransactionFailed',
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
                console.log(err);
            }

        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'failed',
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

    handleDonateClickEthereum = async (chainId, coin_adres) => {
        try{
            await clearWeb3Provider(this);
            await initWeb3Modal(chainId);
            await initWeb3(chainId, this);
            let web3 = this.state.web3;
            let accounts = this.state.accounts;
            var chains_coins = this.state.chains_coins;
            HEOCampaign = (await import("../remote/"+ chainId + "/HEOCampaign")).default;
            ERC20Coin = (await import("../remote/"+ chainId + "/ERC20")).default;
            let campaignAddress = this.state.campaign.addresses[chainId];
            let campaignInstance = new web3.eth.Contract(HEOCampaign, campaignAddress);
            let userCoinInstance = new web3.eth.Contract(ERC20Coin, coin_adres);
            let campaignBalance = await userCoinInstance.methods.balanceOf(campaignAddress).call();
            var that = this;
            ReactGA.event({
                category: "donation",
                action: "donate_button_click",
                value: parseInt(campaignBalance), // optional, must be a number
                nonInteraction: false
            });

            try {

                let result = await campaignInstance.methods.donateToBeneficiary(coin_adres).send(
                 {from: accounts[0]}
                 ).once('transactionHash', function(transactionHash) {
                    console.log(`transaction hash for donateToBeneficiary ${transactionHash}`);
                    that.setState({modalMessage: "waitingForNetwork"})
                });
                console.log(`Done with transactions`);
                if(result.code) {
                    this.setState({
                        showModal: true, modalTitle: 'failed',
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
                for (let j = 0; j < chains_coins.length; j++){
                    if ((chains_coins.chain === chainId)&&(chains_coins.coin.address === coin_adres)){
                        chains_coins.donate = await this.getDaonateSize(chainId, this.state.campaignId, coin_adres);
                        break;
                    }
                }
                this.setState({chains_coins:chains_coins});
            } catch (err) {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: 'blockChainTransactionFailed',
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
                console.log(err);
            }

        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'failed',
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

    render() {
        return (
            <div>
                <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
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
                                }
                            }>
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <Link className={"backToCampaignsLink"} to="/myCampaigns"><span><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToMyCampaigns'/></span></Link>
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
                            <Row id='donateRow'>
                                <InputGroup className="mb-1">
                                    <InputGroup.Append>
                                        <DropdownButton id='donateButton' title={i18n.t('withdrawDonations')}>
                                            {this.state.chains_coins.map((item, i) =>
                                                    <Dropdown.Item key={item["CHAIN"]} as="button" onClick={() => this.handleDonateClick(item.chain, item.coin.address, item.blockChainOrt)}>
                                                     {item.coin.name} ({item.chain_name})  {"-"}  {i18n.t('donationsSize')}{":"} {item.donate}
                                                     </Dropdown.Item>
                                            )}
                                        </DropdownButton>
                                    </InputGroup.Append>
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


    async componentDidMount() {
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
                    modalMessage,
                })
            })
        let campaign = (await this.getCampaign(campaignId));
        if(!campaign) {
          this.props.history.push("/404");
          return;
        }
        var lng;
        this.state.donationAmount = campaign.defaultDonationAmount ? campaign.defaultDonationAmount : "10";
        campaign.percentRaised = 100 * (campaign.raisedAmount)/campaign.maxAmount;
        var contentState = {};
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
        var chains_coins = [];
        await axios.post('/api/getcoinslist')
        .then(res => {
            for (let i = 0; i <  res.data.length; i++){
                res.data[i].chain_name = "";
                for (let j = 0; j < chains.length; j++){
                  if (chains[j].CHAIN === res.data[i].chain){
                   res.data[i].chain_name = chains[j].CHAIN_NAME;
                   res.data[i].donate = 0;
                   chains_coins.push(res.data[i]);
                  }
                }
            }
        }).catch(err => {
            if (err.response) {
                modalMessage = 'Failed to load coins. We are having technical difficulties'}
            else if(err.request) {
                modalMessage = 'Failed to load coins. Please check your internet connection'
            }
            console.log(err);
            that.setState({
                showError: true,
                modalMessage: modalMessage
            })
        })
        for(let j = 0; j < chains_coins.length; j++){
            if (chains_coins[j].blockChainOrt === "ethereum")
            chains_coins[j].donate = await this.getDaonateSize(chains_coins[j].chain, campaign, chains_coins[j].coin.address);
            else if (chains_coins[j].blockChainOrt === "tron")
            chains_coins[j].donate = await this.getDaonateSizeTron(chains_coins[j].chain, campaign, chains_coins[j].coin.address);
        }
        this.setState({chains_coins:chains_coins});
        let globals = config.get("GLOBALS");
        globals.forEach(element => {
            if(element._id === 'FIATPAYMENT') {
                if(campaign.fiatPayments)
                that.setState({fiatPaymentEnabled: element.enabled});
                else that.setState({fiatPaymentEnabled: false});
                if(element.enabled) {
                    if(element.CIRCLE && !element.PAYADMIT) {
                        this.setState(({
                            fiatPaymentProvider: 'circle'
                        }));
                    } else if (!element.CIRCLE && element.PAYADMIT) {
                        that.setState(({
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
        this.setState({
            chains: chains,
            campaignId: campaignId,
            campaign : campaign,
            coins: dedupedCoinNames,
            editorState: EditorState.createWithContent(contentState[i18n.language], createDecorator())
        });
        await this.updateRaisedAmount();
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });

        if(params.fp) {
            if(params.fp === 's') {
                this.setState({
                    showModal: true, modalTitle: 'complete',
                    modalMessage: 'thankYouFiatDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false, tryAgainCC: false, ccinfo: {}
                });
            } else if(params.fp === 'f') {
                that.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: 'failed3ds',
                    errorIcon: 'XCircle', modalButtonMessage: 'tryAgain',
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: true,
                    donationAmount: params.am
                });
            } else if(params.fp === 'pa' && params.state) {
                if(params.state==='declined' || params.state==='cancelled') {
                    that.setState({
                        showModal: true, modalTitle: 'failed', modalMessage: 'cardPaymentDeclined',
                        errorIcon: 'XCircle', modalButtonMessage: 'tryAgain',
                        modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false,
                        donationAmount: params.am,  ccinfo: {}
                    });
                } else {
                    that.setState({
                        showModal: true, modalTitle: 'complete',
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
      <a href={url} target='_blank' rel="noopener noreferrer">
        {props.children}
      </a>
    );
};
export default WithdrawDonations;

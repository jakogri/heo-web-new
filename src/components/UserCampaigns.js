import React, { Component } from 'react';
import config from 'react-global-configuration';
import '../css/modal.css';
import '../css/campaignList.css';
import '../css/campaignPage.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal} from 'react-bootstrap';
import { ChevronLeft,CheckCircle, ExclamationTriangle, HourglassSplit, XCircle} from 'react-bootstrap-icons';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { i18nString, DescriptionPreview, initWeb3, initTron } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';

import ReactGA from "react-ga4";

ReactGA.initialize("G-C657WZY5VT");

class UserCampaigns extends Component {
    constructor(props) {
        super(props);
        this.state = {
            campaigns: [],
            showError:false,
            modalTitle:"",
            modalMessage:"",
            isLoggedIn:false,
            isLoggedInTron:false,
            whiteListed:false,
            showTwoButtons: false,
            campaignId: '',
            chainId:"",
            tronChainId:"",
            chainConfig:{},
            tronChainConfig:{}, 
            fileName: '',
            showModal: false,
            showModalDialog: false,
            accounts:{},
            modalButtonMessage:"",
            modalButtonTwoMessage:"",
        };
    }

    async getCampaignsInEtherium(){
        try {
            if(!this.state.accounts || !this.state.web3) {
                await initWeb3(this.state.chainId, this);
            }
            let data = {chain: this.state.chainId, account: this.state.accounts[0].toLowerCase()};
            this.setState(
                {showModal:true, modalTitle: 'processingWait',
                modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
                modalButtonVariant: "gold", waitToClose: true
            });
            let res = await axios.post('/api/campaign/campaignstouser', data, {headers: {"Content-Type": "application/json"}});
            if (res.data === "success"){
                this.setState({showModal:true,
                    goHome: false,
                    waitToClose: false,
                    isLoggedIn: false,
                    modalIcon: 'CheckCircle',
                    modalTitle: 'success',
                    modalMessage: 'operationSaccess',
                    modalButtonMessage: 'closeBtn',
                    modalButtonVariant: "#E63C36"}
                );  
            }
        } catch (err) {
            console.log(err);
            this.setState({showModal:true,
                goHome: false,
                waitToClose: false,
                isLoggedIn: false,
                modalIcon: 'XCircle',
                modalTitle: 'authFailedTitle',
                modalMessage: 'authFailedMessage',
                modalButtonMessage: 'closeBtn',
                modalButtonVariant: "#E63C36"}
            );
        }
    }

    async getCampaignsInTron(){
        try {
            initTron(this.state.tronChainId,this)
            let account = window.tronAdapter._wallet.tronWeb.defaultAddress.hex;
            let data = {chain: this.state.tronChainId, account: account};
            let res = await axios.post('/api/campaign/campaignstouser', data, {headers: {"Content-Type": "application/json"}});
            if (res.data === "success"){
                await this.loadCampaigns();
                this.setState({showModal:true,
                    goHome: false,
                    waitToClose: false,
                    isLoggedIn: false,
                    modalTitle: 'success',
                    modalIcon: 'CheckCircle',
                    modalMessage: 'operationSaccess',
                    modalButtonMessage: 'closeBtn',
                    modalButtonVariant: "#E63C36"}
                );  
            }
            else{
                console.log(res);
                this.setState({showModal:true,
                    goHome: false,
                    waitToClose: false,
                    isLoggedIn: false,
                    modalIcon: 'XCircle',
                    modalTitle: 'authFailedTitle',
                    modalMessage: 'authFailedMessage',
                    modalButtonMessage: 'closeBtn',
                    modalButtonVariant: "#E63C36"}
                ); 
            }  
        } catch (err) {
            console.log(err);
            this.setState({showModal:true,
                goHome: false,
                waitToClose: false,
                isLoggedIn: false,
                modalIcon: 'XCircle',
                modalTitle: 'authFailedTitle',
                modalMessage: 'authFailedMessage',
                modalButtonMessage: 'closeBtn',
                modalButtonVariant: "#E63C36"}
            );
        }
    }

    async componentDidMount() {
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        let chainId = config.get("CHAIN");
        let tronChainId = config.get("TRON_CHAIN");
        this.setState({
            chainId: chainId,
            tronChainId: tronChainId,
            isLoggedIn : false,
            isLoggedInTron: false,
            whiteListed: false
        });
        this.loadCampaigns();
    }

    async loadCampaigns() {
        this.setState({showModal:true, modalTitle: 'processingWait', modalIcon: 'HourglassSplit',
            modalMessage: 'waitingForOperation',
            modalButtonVariant: "gold", waitToClose: true});
        var campaigns = [];
        var donates = [];
        var modalTitle = 'failedToLoadDonates';
        await axios.post('/api/campaign/getalldonationsforlist')
        .then(res => {
            donates = res.data;
        }).catch(err => {
            modalTitle = 'failedToLoadDonates'
            console.log(err);
            this.setState({showModal:true,
                modalTitle: modalTitle,
                modalMessage: 'technicalDifficulties',
                modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false});
        })
        await axios.post('/api/campaign/loadUserCampaigns', {headers: {"Content-Type": "application/json"}})
        .then(res => {
            campaigns = res.data;
            this.setState({
                showModal: false,
                campaigns: campaigns
            });
        }).catch(err => {
            modalTitle = 'failedToLoadCampaigns'
            console.log(err);
            this.setState({showModal:true,
                modalTitle: modalTitle,
                modalMessage: 'technicalDifficulties',
                modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false});
        })
        
        campaigns.forEach( campaign => {
            const found = donates.find(element => element._id === campaign._id);
            let raisedDonations = found ? found.totalQuantity  : 0;
            let raisedAmount = campaign.raisedAmount ? parseFloat(campaign.raisedAmount) : 0;
            let fiatDonations = campaign.fiatDonations ? parseFloat(campaign.fiatDonations) : 0;
            let raisedOnCoinbase = campaign.raisedOnCoinbase ? parseFloat(campaign.raisedOnCoinbase) : 0;
            if(raisedAmount || fiatDonations || raisedOnCoinbase || raisedDonations) {
                campaign["raisedAmount"] = Math.round((raisedAmount + fiatDonations + raisedOnCoinbase + raisedDonations) * 100)/100;
            }
        })
        
        this.setState({
            showModal: false,
            campaigns: campaigns
        });
    }

    async closeCampaignPrep(id, imageURL) {
        
        console.log('close campaign');
        this.setState({
            showTwoButtons: true, waitToClose: false,
            showModal: true, modalIcon:'ExclamationTriangle',
            modalTitle: 'closeCampaign',
            modalButtonMessage: 'yes',
            modalButtonTwoMessage:'no',
            modalMessage: 'final',
            campaignId: id
        })
        var splits;
        if(imageURL) {
            splits = imageURL.split('/');
            this.setState({fileName: splits[splits.length -1]});
        }
    }

    async closeCampaign() {
        this.setState({showModal: true, modalMessage: 'waitingForOperation', modalIcon:'HourglassSplit',modalTitle: 'processingWait',
            showTwoButtons: false, modalButtonVariant: "gold", waitToClose: true});
        try {
           await this.deleteimage();
           await this.deActivateInDB();
        } catch (err) {
            console.log(err);
            this.setState({
                waitToClose: false, modalMessage: 'technicalDifficulties',
                modalIcon:'XCircle', modalButtonMessage: 'closeBtn', modalTitle: 'failed',
                modalButtonVariant: "#E63C36", showTwoButtons: false});
        }
    }

    async deleteimage () {
       let that = this;
       let dataEmail;   
       try{
        let data = {name: this.state.fileName};
        let res = await axios.post('/api/deleteimage', data, {headers: {"Content-Type": "application/json"}});
        if (res.data !== 'complete'){
            dataEmail ={key: 'Failed to delete picture', text:`Failed to delete picture with name - ${that.state.fileName}`} 
            axios.post('/api/sendemail', dataEmail, {headers: {"Content-Type": "application/json"}});
            return (res.data);
           }   
        else {
            console.log("Success deleting image");
            return(res.data);
        } 
       } catch (err){
        dataEmail ={key: 'Failed to delete picture', text:`Failed to delete picture with name - ${that.state.fileName}`} 
        axios.post('/api/sendemail', dataEmail, {headers: {"Content-Type": "application/json"}});
        console.log(err);
        return (err);
       }
    }

    async deActivateInDB() {
      try{
        let data = {id : this.state.campaignId};
        let res = await axios.post('/api/campaign/deactivate', data, {headers: {"Content-Type": "application/json"}});
        if (res.data === 'success'){
            this.setState({
                modalMessage: 'campaignDeleted', modalTitle: 'complete',
                modalIcon: 'CheckCircle', modalButtonMessage: 'ok',
                modalButtonVariant: '#588157', waitToClose: false, showTwoButtons: false
            });
           await this.loadCampaigns(); 
        } 
        else{
            this.setState({
                waitToClose: false, modalMessage: 'technicalDifficulties',
                modalIcon:'XCircle', modalButtonMessage: 'closeBtn', modalTitle: 'failed',
                modalButtonVariant: "#E63C36", showTwoButtons: false}); 
        }
        return(res.data);
      } catch (err){
        this.setState({
            waitToClose: false, modalMessage: 'technicalDifficulties',
            modalIcon:'XCircle', modalButtonMessage: 'closeBtn', modalTitle: 'failed',
            modalButtonVariant: "#E63C36", showTwoButtons: false});
        return(err);    
      }
    }

    render() {
        return (
            <div> 
               <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
                <Modal.Body>  
                    <p className='modalIcon'>
                        {this.state.modalIcon === 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.modalIcon === 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.modalIcon === 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.modalIcon === 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                    <div><p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p></div>
                     <p className='modalMessage'><Trans i18nKey={this.state.modalMessage}>
                            Your account has not been cleared to create campaigns.
                            Please fill out this
                            <a target='_blank' rel="noopener noreferrer" href='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</a>
                            to ne granted permission to fundraise on HEO Platform
                        </Trans></p>
                        { !this.state.waitToClose &&
                        <Row>
                        <Col>    
                        <Button className='myModalButton' style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ async () => {this.setState({showModal:false}); if(this.state.goHome) this.props.history.push('/');
                            else if (this.state.modalMessage === 'final') this.closeCampaign();}}>
                         <Trans i18nKey={this.state.modalButtonMessage} />  
                        </Button>
                        </Col>
                        {this.state.showTwoButtons && <Col> 
                        <Button className='myModalButton' style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ async () => {this.setState({showModal:false}); if(this.state.goHome) this.props.history.push('/');}}>
                         <Trans i18nKey={this.state.modalButtonTwoMessage} />  
                        </Button>
                        </Col>}
                        </Row>}
                   </Modal.Body>
                </Modal> 
                <div><p className='modalTitle'><Trans i18nKey={'myFundraisers'}/></p></div>
               <Row> 
                <Container className='backToCampaignsDiv'>
                    <Link className={"backToCampaignsLink"} to="/"><span><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToCampaigns'/></span></Link>
                </Container>
                </Row>
                {this.state.campaigns.length === 0 &&<Row> 
                <h1>
                 <Trans i18nKey='noUserCampaigns'>You did not create any campaigns yet. Click <Link to="/new">here</Link> to create your first campaign.</Trans>
                </h1>
                </Row>}
                
                <div id="campaingListMainDiv">
                    <Container>
                        {this.state.campaigns.map((item, i) =>
                            <Row style={{marginBottom: '20px'}} key={i}>
                                <Card>
                                    <Row>
                                        <Col sm='3' id='picColumn'>
                                            <Card.Img src={item.mainImageURL} fluid='true' />
                                        </Col>
                                        <Col >
                                            <Link to={'/campaign/' + item._id} id='cardLink'>
                                            <Row>
                                                <Card.Body>
                                                    <Card.Title>{i18nString(item.title, i18n.language)}</Card.Title>
                                                    <Card.Text>{`${DescriptionPreview(item.description, i18n.language)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'><Trans i18nKey='readMore'/></span></Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>{item.raisedAmount}</span>{i18n.t('raised')}{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={100 * item.raisedAmount/item.maxAmount} />
                                                </Card.Body>
                                            </Row>
                                            </Link>
                                            <Row id='buttonsRow'>
                                              <Col className='buttonCol'><Link to={'/editCampaign/' + item.key} id='cardLink'><Button id='editBtn' block><Trans i18nKey='editCmpnBtn'/></Button></Link></Col>
                                            </Row>
                                        </Col>
                                    </Row>
                                </Card>
                            </Row>
                        )}
                    </Container>
                </div>
            </div>

        );
    }
}

export default UserCampaigns;

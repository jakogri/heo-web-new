import React, { Component } from 'react';
import axios from 'axios';
import '../css/campaignList.css';
import '../css/modal.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { i18nString, DescriptionPreview } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import ReactGA from "react-ga4";
import { ChevronLeft, ChevronRight} from 'react-bootstrap-icons';
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
import config from "react-global-configuration";

const IMG_MAP = {"BUSD": busdIcon,
    "BNB": bnbIcon,
    "USDC": usdcIcon,
    "USDT": usdtLogo,
    "ETH": ethIcon,
    "cUSD": cusdIcon};

ReactGA.initialize("G-C657WZY5VT");

class CampaignList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            campaigns: [],
            pages:[],
            pagescount:0,
            showError:false,
            errorMessage:"",
            lang:'',
            fiatPaymentEnabled:false,
            coinslist: []
        };
    }

    async componentDidMount() {
        ReactGA.send({ hitType: "pageview", page: "/" });
        await this.getCoins();
        let globals = await config.get("GLOBALS");
        globals.forEach(element => {
            if(element._id === 'FIATPAYMENT') {
                this.setState({fiatPaymentEnabled: element.enabled});
            }
        });
        let campaigns = await this.getCampaigns(window.curPg);
        let pages = [];
        for (let i = 0; i < this.state.pagescount; i++){
            if (i > 8) break;
            if ((window.curPg > 5)&&(this.state.pagescount > (window.curPg + 4))) pages[i] = window.curPg - 4 + i;
            else if((window.curPg > 5)&&(this.state.pagescount <= (window.curPg + 4))) pages[i] = this.state.pagescount - 8 + i;
            else if (window.curPg <= 5) pages[i] = i+1;
        }
        this.setState({
            campaigns : campaigns,
            pages:pages
        });
    }

    async getCoins(){
        var errorMessage = 'Failed to load coins';
        await axios.post('/api/getcoinslist')
        .then(res => {
            this.setState({coinslist:res.data});
        }).catch(err => {
            if (err.response) {
                errorMessage = 'Failed to load coins. We are having technical difficulties'}
            else if(err.request) {
                errorMessage = 'Failed to load coins. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                errorMessage
            })
        })
    }

    async changePage(page){
        window.curPg = page;
        let campaigns = await this.getCampaigns(page);
        let pages = [];
        for (let i = 0; i < this.state.pagescount; i++){
            if (i > 8) break;
            if ((window.curPg > 5)&&(this.state.pagescount > (window.curPg + 4))) pages[i] = window.curPg - 4 + i;
            else if((window.curPg > 5)&&(this.state.pagescount <= (window.curPg + 4))) pages[i] = this.state.pagescount - 8 + i;
            else if (window.curPg <= 5) pages[i] = i+1;
        }
        this.setState({
            campaigns : campaigns,
            pages:pages
        });
    }

    async getCampaigns(startRec) {
        var campaigns = [];
        var donates = [];
        await this.getCoins();
        var that = this;
        var errorMessage = 'Failed to load campaigns';
        let data = {startRec : (startRec - 1)*window.pgCount, compaignsCount:window.pgCount};

        await axios.post('/api/campaign/loadAll', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
          campaigns = res.data.curArr;
          let pagescount = (window.pgCount > res.data.arCount)?1:res.data.arCount/window.pgCount;
          this.setState({pagescount:pagescount});
        }).catch(err => {
            if (err.response) {
                errorMessage = 'Failed to load campaigns. We are having technical difficulties'}
            else if(err.request) {
                errorMessage = 'Failed to load campaings. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                errorMessage,
            })
        })
        //
        errorMessage = 'Failed to load donates';
        await axios.post('/api/campaign/getalldonationsforlist')
        .then(res => {
            donates = res.data;
        }).catch(err => {
            if (err.response) {
                errorMessage = 'Failed to load donates. We are having technical difficulties'}
            else if(err.request) {
                errorMessage = 'Failed to load donates. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                errorMessage,
            })
        })
        campaigns.forEach( campaign => {
            const found = donates.find(element => element._id === campaign._id);
            let totalQuantity = found ? found.totalQuantity : 0;
            let raisedAmount = campaign.raisedAmount? parseFloat(campaign.raisedAmount) : 0;
            let fiatDonations = campaign.fiatDonations ? parseFloat(campaign.fiatDonations) : 0;
            let raisedOnCoinbase = campaign.raisedOnCoinbase ? parseFloat(campaign.raisedOnCoinbase) : 0;
            if(raisedAmount || fiatDonations || raisedOnCoinbase || totalQuantity) {
                campaign.donate_count = Math.round((raisedAmount + fiatDonations + raisedOnCoinbase + totalQuantity) * 100)/100;
            }
            //dedupe coin names for "accepting" section
            let dedupedCoinNames = [];
            for(var chain in campaign.addresses){
             for(let i = 0; i < that.state.coinslist.length; i++){
              if (that.state.coinslist[i].chain === chain){
               let coinName = that.state.coinslist[i].coin.name;
               if(!dedupedCoinNames.includes(coinName)) {
                dedupedCoinNames.push(coinName);
               }
              }
             }
            }
            campaign.dedupedCoinNames = dedupedCoinNames;
        })
        return campaigns;
    }

    render() {
        return (
            <div>
                <Modal show={this.state.showError} onHide={()=>{}} >
                    <Modal.Header closeButton>
                    <Modal.Title>Failed to connect to network.</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>{this.state.errorMessage}</Modal.Body>
                    <Modal.Footer>
                    <Button variant="secondary" onClick={ () => {this.setState({showError:false})}}>
                        Close
                    </Button>
                    </Modal.Footer>
                </Modal>
                <div id="campaingListMainDiv">
                    <Container>
                        {this.state.campaigns.map((item, i) =>
                            <Row style={{marginBottom: '20px'}} key={i}>
                                <Link to={'/campaign/' + item.key} id='cardLink' key={i}>
                                <Card>
                                    <Row>
                                        <Col sm='3' id='picColumn'>
                                            <Card.Img src={item.mainImageURL} fluid='true' />
                                        </Col>
                                        <Col >
                                            <Row>
                                                <Card.Body>
                                                    <Card.Title>{i18nString(item.title, i18n.language)}</Card.Title>
                                                    <Card.Text><span className={"h2"}>{i18nString(item.org, i18n.language)}</span><br/>
                                                        {`${DescriptionPreview(item.description, i18n.language)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'><Trans i18nKey='readMore'/></span>
                                                    </Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>
                                                        &#36;{item.donate_count}</span>{i18n.t('raised')}&#36;{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={100 * item.donate_count/item.maxAmount} />
                                                </Card.Body>
                                            </Row>
                                            <Row >
                                                <Col className='buttonCol'>
                                                    <div id='acceptingBtn' className='cardButtons'><p><Trans i18nKey='accepting'/></p>
                                                        <p id='currencyName'>
                                                            {this.state.fiatPaymentEnabled && item.fiatPayments && <span className='coinRewardInfo'><img src={visaMcLogo} width={21} height={20} alt="for sell" style={{marginRight:5, marginLeft:5}} /> </span>}
                                                            {item.dedupedCoinNames.map((coin, j) =>
                                                                <span key={item._id + "-" + coin}><img src={IMG_MAP[coin]} width={20} height={20} alt="for sell" style={{marginLeft:5, marginRight:5}} /> </span>
                                                            )}

                                                            <span className='coinRewardInfo'><img src={ethIcon} width={20} height={20} alt="for sell" style={{marginRight:5, marginLeft:5}} /> </span>
                                                            <span className='coinRewardInfo'><img src={btcLogo} width={20} height={20} alt="for sell" style={{marginRight:5, marginLeft:5}} /> </span>
                                                            <span className='coinRewardInfo'><img src={daiLogo} width={20} height={20} alt="for sell" style={{marginRight:5, marginLeft:5}} /> </span>
                                                            <span className='coinRewardInfo'><img src={usdcIcon} width={20} height={20} alt="for sell" style={{marginRight:5, marginLeft:5}} /> </span>
                                                            <span className='coinRewardInfo'><img src={usdtLogo} width={20} height={20} alt="for sell" style={{marginRight:5, marginLeft:5}} /> </span>
                                                            <span className='coinRewardInfo'><img src={ltcLogo} width={20} height={20} alt="for sell" style={{marginRight:5, marginLeft:5}} /> </span>

                                                        </p>
                                                    </div></Col>
                                                <Col className='buttonCol'><Button variant="danger" id='donateBtn' block><Trans i18nKey='donate'/></Button></Col>
                                            </Row>
                                        </Col>
                                    </Row>
                                </Card>
                                </Link>
                            </Row>
                        )}
                    </Container>
                </div>
                <Row>
                {(this.state.pagescount > 1)&&<Col md={{ span: 9, offset: 3 }}>
                <div class="btn-toolbar" role="toolbar" >
                 <Button disabled={window.curPg === this.state.pages[0]}
                  onClick={async() =>{window.curPg=window.curPg-1; await this.changePage(window.curPg);}}><span><ChevronLeft/></span></Button>
                 <Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor : "rgba(255,255,255,.1)"}}></Button>
                {((this.state.pages[0] > 1)&&(this.state.pagescount > 9))&&<div class = "btn-group">
                 <Button style={{cursor:"pointer"}} onClick={async()=>{window.curPg=1; await this.changePage(window.curPg - 1);}}>{1}</Button>
                 <Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor :"rgba(255,255,255,.1)", color: "#0E161C"}}><span>...</span></Button>}
                 <Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor : "rgba(255,255,255,.1)"}}></Button>
                </div>}
                {this.state.pages.map((item, i) =><div>
                 <Button style={{cursor:"pointer"}} disabled={window.curPg === item}
                  onClick={async()=>{window.curPg=item; await this.changePage(item,this.state.pages[0]);}}>{item}</Button>
                 <Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor : "rgba(255,255,255,.1)"}}></Button>
                </div>)}
                {((this.state.pages[this.state.pages.length - 1] < this.state.pagescount)&&(this.state.pagescount > 9))&&<div class = "btn-group">
                 <Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor : "rgba(255,255,255,.1)", color: "#0E161C"}}><span>...</span></Button>
                 <Button style={{cursor:"pointer"}} onClick={async()=>{window.curPg=this.state.pagescount; await this.changePage(this.state.pagescount);}}>
                    {this.state.pagescount}</Button>
                 <Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor : "rgba(255,255,255,.1)"}}></Button>
                </div>}
                 <Button disabled={window.curPg===this.state.pagescount} style={{cursor:"pointer"}}
                   onClick={async()=>{window.curPg=window.curPg+1; await this.changePage(window.curPg);}}><span><ChevronRight/></span></Button>
                </div>
                </Col>}
                </Row>
                <Row><Col><Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor : "rgba(255,255,255,.1)"}}></Button></Col></Row>
            </div>

        );
    }
}

export default CampaignList;

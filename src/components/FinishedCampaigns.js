// React component for displaying finished campaigns
import React, { Component, createRef } from 'react'; 
import { ChevronLeft, ChevronRight} from 'react-bootstrap-icons';
import '../css/finishedCampaigns.css';
import cn from "classnames";
import "../css/styles.css";
import { Card, Container, ProgressBar,Row, Button, Col } from 'react-bootstrap';
import { i18nString, DescriptionPreview } from '../util/Utilities';
import i18n from '../util/i18n';
import axios from 'axios';

class FinishedCampaigns extends Component {
    constructor(props) {
        super(props);
        this.state = {
            campaigns: [],
            showError:false,
            errorMessage:"",
            lang:'',
            canScrollLeft:true,
            canScrollRight:false,
        };
        this.scrollRef = createRef(null);
    }
      
    async componentDidMount() {
        let result = await axios.post('/api/campaign/getCountInFinishPage', {headers: {"Content-Type": "application/json"}});
        window.finishCompPerPg = result.data;
         this.setState({
            campaigns : (await this.getCampaigns())
        });
    }
  
    checkForScrollPosition = async(e) => {
        let scrollLeft = e.target.scrollLeft;
        let scrollWidth = e.target.scrollWidth;
        let clientWidth = e.target.clientWidth;
        let canScrollRight = (scrollLeft > 0);
        let canScrollLeft = (scrollWidth > (scrollLeft + clientWidth + 2));
        if (canScrollLeft !== this.state.canScrollLeft)
        this.setState({canScrollLeft:canScrollLeft}); 
        if (canScrollRight !== this.state.canScrollRight)
        this.setState({canScrollRight:canScrollRight}); 
        if ((canScrollLeft === false)&&((window.firstFinishComp + window.finishCompPerPg) < window.finishCompCount)){
            if((window.firstFinishComp + window.finishCompPerPg + 1)> window.finishCompCount){
                window.firstFinishComp =  window.finishCompCount+ window.firstFinishComp - window.finishCompPerP;
            }
            else window.firstFinishComp =  window.firstFinishComp +1;    
            e.target.scrollLeft = e.target.clientWidth/3;       
            this.setState({
                campaigns : (await this.getCampaigns())
            });
        }
        
        else if((canScrollRight === false)&&(window.firstFinishComp > 0)){
            window.firstFinishComp =  window.firstFinishComp - 1;
            if (window.firstFinishComp < 0) window.firstFinishComp = 0;
            e.target.scrollLeft = 0;
            this.setState({
                campaigns : (await this.getCampaigns())
            });
        }
    }
    
    async getCampaigns() {
        var campaigns = [];
        var errorMessage = 'Failed to load campaigns';
        let data = {startRec : window.firstFinishComp, compaignsCount:window.finishCompPerPg};
        await axios.post('/api/campaign/loadFinishedCampaigns', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
          campaigns = res.data.curArr;
          window.finishCompCount = res.data.arCount;
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
        campaigns.forEach( campaign => {
            let raisedAmount = campaign.raisedAmount ? parseFloat(campaign.raisedAmount) : 0;
            let fiatDonations = campaign.fiatDonations ? parseFloat(campaign.fiatDonations) : 0;
            let raisedOnCoinbase = campaign.raisedOnCoinbase ? parseFloat(campaign.raisedOnCoinbase) : 0;
            if(raisedAmount || fiatDonations || raisedOnCoinbase) {
                campaign["raisedAmount"] = Math.round((raisedAmount + fiatDonations + raisedOnCoinbase) * 100)/100;
            } else {
                campaign["raisedAmount"] = 0;
            }
        })
        return campaigns;
    }

    render() {
        return (
            <div>
            <div className="finishedCampaignsMainDiv" >
               {(window.finishCompCount>3)&&<ul className="list" ref = {this.scrollRef} onScroll={this.checkForScrollPosition}> 
                {this.state.campaigns.map((item, i) =>  
                 <Container id="finishedCampaignsMainDiv">
                    <Card className="item"  key={i}>
                        <Card.Body>
                                <div id='finishedCardHeader'>
                                    <Card.Img src={item.mainImageURL} fluid='true' />
                                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M20.7108 2.59009C25.759 1.44952 31.0406 1.97135 35.768 4.07774C36.2725 4.30252 36.8636 4.07578 37.0884 3.57131C37.3132 3.06684 37.0865 2.47566 36.582 2.25088C31.4607 -0.0310425 25.7389 -0.596353 20.2701 0.639261C14.8012 1.87488 9.87831 4.84521 6.23552 9.10727C2.59273 13.3693 0.425254 18.6947 0.056351 24.2893C-0.312552 29.8838 1.13688 35.4478 4.18849 40.1512C7.24009 44.8547 11.7304 48.4458 16.9896 50.3888C22.2489 52.3318 27.9953 52.5227 33.3719 50.933C38.7485 49.3433 43.4672 46.0582 46.8242 41.5676C50.1813 37.077 51.9968 31.6216 52 26.0149V26.0143V23.7143C52 23.162 51.5523 22.7143 51 22.7143C50.4477 22.7143 50 23.162 50 23.7143V26.0137C49.997 31.1891 48.3212 36.2249 45.2224 40.3701C42.1236 44.5153 37.7679 47.5477 32.8048 49.0151C27.8418 50.4825 22.5374 50.3063 17.6827 48.5127C12.828 46.7192 8.68316 43.4044 5.8663 39.0627C3.04943 34.721 1.71149 29.5851 2.05202 24.4209C2.39254 19.2567 4.39329 14.3409 7.75586 10.4067C11.1184 6.4725 15.6627 3.73066 20.7108 2.59009ZM51.7074 6.72091C52.0978 6.33019 52.0975 5.69703 51.7067 5.3067C51.316 4.91637 50.6828 4.91669 50.2925 5.30741L25.9996 29.6246L19.2071 22.832C18.8166 22.4415 18.1834 22.4415 17.7929 22.832C17.4024 23.2226 17.4024 23.8557 17.7929 24.2463L25.2929 31.7463C25.4805 31.9339 25.7349 32.0392 26.0002 32.0392C26.2655 32.0391 26.5199 31.9336 26.7075 31.7459L51.7074 6.72091Z" fill="url(#paint0_linear_17_2548)"></path>
                                        <defs>
                                            <linearGradient id="paint0_linear_17_2548" x1="1.14424e-06" y1="14.5" x2="39" y2="45" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#8E64FF"></stop>
                                            <stop offset="1" stopColor="#37FFC6"></stop>
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <Card.Title>{i18nString(item.title, i18n.language)}</Card.Title>
                                <Card.Text><span className={"h2"}>{i18nString(item.org, i18n.language)}</span><br/>
                                    {`${DescriptionPreview(item.description, i18n.language)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                </Card.Text>
                                <p id='progressBarLabel'><span id='progressBarLabelStart'>
                                &#36;{item.raisedAmount}</span>{i18n.t('raised')}&#36;{item.maxAmount} {i18n.t('goal')}</p>
                            <ProgressBar now={100 * item.raisedAmount/item.maxAmount} />
                        </Card.Body>
                    </Card>
                 </Container>   
                )}
                </ul>}
                {(window.finishCompCount<=3)&&<ul className="list1" ref = {this.scrollRef} onScroll={this.checkForScrollPosition}> 
                {this.state.campaigns.map((item, i) =>  
                 <Container id="finishedCampaignsMainDiv">
                    <Card className="item"  key={i}>
                        <Card.Body>
                                <div id='finishedCardHeader'>
                                    <Card.Img src={item.mainImageURL} fluid='true' />
                                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M20.7108 2.59009C25.759 1.44952 31.0406 1.97135 35.768 4.07774C36.2725 4.30252 36.8636 4.07578 37.0884 3.57131C37.3132 3.06684 37.0865 2.47566 36.582 2.25088C31.4607 -0.0310425 25.7389 -0.596353 20.2701 0.639261C14.8012 1.87488 9.87831 4.84521 6.23552 9.10727C2.59273 13.3693 0.425254 18.6947 0.056351 24.2893C-0.312552 29.8838 1.13688 35.4478 4.18849 40.1512C7.24009 44.8547 11.7304 48.4458 16.9896 50.3888C22.2489 52.3318 27.9953 52.5227 33.3719 50.933C38.7485 49.3433 43.4672 46.0582 46.8242 41.5676C50.1813 37.077 51.9968 31.6216 52 26.0149V26.0143V23.7143C52 23.162 51.5523 22.7143 51 22.7143C50.4477 22.7143 50 23.162 50 23.7143V26.0137C49.997 31.1891 48.3212 36.2249 45.2224 40.3701C42.1236 44.5153 37.7679 47.5477 32.8048 49.0151C27.8418 50.4825 22.5374 50.3063 17.6827 48.5127C12.828 46.7192 8.68316 43.4044 5.8663 39.0627C3.04943 34.721 1.71149 29.5851 2.05202 24.4209C2.39254 19.2567 4.39329 14.3409 7.75586 10.4067C11.1184 6.4725 15.6627 3.73066 20.7108 2.59009ZM51.7074 6.72091C52.0978 6.33019 52.0975 5.69703 51.7067 5.3067C51.316 4.91637 50.6828 4.91669 50.2925 5.30741L25.9996 29.6246L19.2071 22.832C18.8166 22.4415 18.1834 22.4415 17.7929 22.832C17.4024 23.2226 17.4024 23.8557 17.7929 24.2463L25.2929 31.7463C25.4805 31.9339 25.7349 32.0392 26.0002 32.0392C26.2655 32.0391 26.5199 31.9336 26.7075 31.7459L51.7074 6.72091Z" fill="url(#paint0_linear_17_2548)"></path>
                                        <defs>
                                            <linearGradient id="paint0_linear_17_2548" x1="1.14424e-06" y1="14.5" x2="39" y2="45" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#8E64FF"></stop>
                                            <stop offset="1" stopColor="#37FFC6"></stop>
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <Card.Title>{i18nString(item.title, i18n.language)}</Card.Title>
                                <Card.Text><span className={"h2"}>{i18nString(item.org, i18n.language)}</span><br/>
                                    {`${DescriptionPreview(item.description, i18n.language)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                </Card.Text>
                                <p id='progressBarLabel'><span id='progressBarLabelStart'>
                                &#36;{item.raisedAmount}</span>{i18n.t('raised')}&#36;{item.maxAmount} {i18n.t('goal')}</p>
                            <ProgressBar now={100 * item.raisedAmount/item.maxAmount} />
                        </Card.Body>
                    </Card>
                 </Container>   
                )}
                </ul>}
         </div>
         
         {(window.finishCompCount > 3)&&<Row>
         <Col>
          <Button style={{cursor:"pointer"}} onClick={() => this.scrollRef.current?.scrollBy({ left: 350, behavior: "smooth" })} 
           className={cn("button","buttonLeft",{"button--hidden":!this.state.canScrollLeft})} disabled = {!this.state.canScrollLeft}>
            <span><ChevronLeft/></span></Button>  
          <Button style={{cursor:"pointer"}}onClick={() => this.scrollRef.current?.scrollBy({ left: -350, behavior: "smooth" })} 
           className={cn("button","buttonRight",{"button--hidden":!this.state.canScrollRight})} disabled={!this.state.canScrollRight}>
            <span><ChevronRight/></span></Button>  
          </Col>
         </Row>}
         <Row><Col><Button style={{backgroundColor : "rgba(255,255,255,.1)", borderColor : "rgba(255,255,255,.1)"}}></Button></Col></Row>    
        </div>        
            
        );
    };   
}

//export the component to be used in other components
export default FinishedCampaigns;
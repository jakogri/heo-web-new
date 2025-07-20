import {Component, Suspense} from 'react';
import React from 'react';
import axios from 'axios';
import CampaignPage from './CampaignPage';
import CreateCampaign from './CreateCampaign';
import UserCampaigns from './UserCampaigns';
import EditCampaign from './EditCampaign';
import MyDonations from './MyDonations';
import Registration from './Registration';
import Page404 from "./Page404";
import TokenSale from './TokenSale'
import logo from '../images/heo-logo.png';
import Home from "./Home";
import '../css/app.css';
import '../css/modal.css';
import { Switch, Route, Link, withRouter } from "react-router-dom";
import { Nav, Navbar, Container, Button, Modal, NavLink} from 'react-bootstrap';
import { CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import { Trans } from 'react-i18next';
import { GetLanguage } from '../util/Utilities';
import {UserContext} from './UserContext';
import ReactGA from "react-ga4";
import i18n from '../util/i18n';
//import {chains} from './chainblock';


ReactGA.initialize("G-C657WZY5VT");
class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            language: 'en',
            showError: false,
            showModal: false,
            waitToClose: false,
            modalMessage: "",
            modalTitle: "",
            modalButtonMessage: "",
            connect: false,
            disabled: "disabled",
            modalButtonVariant: "#32CD32",
            modalIcon: "",
            userEmail: "",
            registrBtnTiile:""
        };
        window.curPg = 1;
        window.pgCount = 0;
        window.finishCompCount = 0;
        window.finishCompPerPg = 0;
        window.firstFinishComp = 0;
    }

    async componentDidMount() {
        let result;
        console.log("email");
        console.log(document.cookie);
        let lang = GetLanguage();
        this.setState({language : lang});
        if(!window.connect)
            window.connect = false;
        result = await axios.post('/api/campaign/getCountInPage', {headers: {"Content-Type": "application/json"}});
        window.pgCount = result.data;

        await this.checkAutorisation();
        this.props.history.listen((location, action) => {
            this.checkAutorisation();
        });
    }


    async checkAutorisation(){
        let result = await axios.post('/api/is_autorisation', {headers: {"Content-Type": "application/json"}});
        if (result.data !== false){
            this.setState({connect:true,userEmail:result.data,registrBtnTiile:'deauthorization'});
        }
        else this.setState({connect:false,registrBtnTiile:'registration'});
    }

    async setLanguage(lang) {
        await i18n.changeLanguage(lang);
        this.setState({language: lang});
        ReactGA.event({
            category: "language",
            action: "language_changed",
            label: lang,
            nonInteraction: false
        });
    }
    render() {
       let lang = GetLanguage();

        return (
            <UserContext.Provider value={this.state}>
            <Suspense fallback="...is loading">
                <main>
                    <div id="mainNavContainer">
                        <Navbar collapseOnSelect expand="lg" id="mainNav">
                            <Container>
                                <Navbar.Brand href="/">
                                            <img
                                                src={logo}
                                                width="100"
                                                height="50"
                                                className="d-inline-block align-top"
                                                alt="HEO logo"
                                            />
                                </Navbar.Brand>
                                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                                <Navbar.Collapse id="basic-navbar-nav">
                                    <Nav className="mr-auto">
                                        <Nav.Link as={Link} eventKey="1" className='mainNavText' to="/"><Trans i18nKey='browse'/></Nav.Link>
                                        <NavLink  as={Link} eventKey="2" className='mainNavText' onClick={async(event) => {
                                          if(!this.state.connect){
                                            this.setState({showModal:true, modalButtonVariant: "#E63C36",
                                            modalTitle:"attention", modalMessage: "noLogMessage", modalButtonMessage:"ok",
                                            modalIcon: "ExclamationTriangle" });
                                            event.preventDefault();
                                          }}} to ='/new'>
                                          <Trans i18nKey='startFundraiser'/>
                                        </NavLink>
                                        <Nav.Link as={Link} eventKey="3" className='mainNavText' onClick={async(event) => {
                                          if(!this.state.connect){
                                            this.setState({showModal:true, modalButtonVariant: "#E63C36",
                                            modalTitle:"attention", modalMessage: "noLogMessage", modalButtonMessage:"ok",
                                            modalIcon: "ExclamationTriangle" });
                                            event.preventDefault();
                                          }}} to ='/myCampaigns'>
                                            <Trans i18nKey='myFundraisers'/>
                                        </Nav.Link>
                                        <Nav.Link eventKey="4" className='mainNavText' as='a' target='_blank' href='https://heo.finance'><Trans i18nKey='about'/></Nav.Link>
                                        {(!this.state.connect)&&<Nav.Link as={Link} eventKey="5" className='mainNavText' to ='/Registration/connect'>
                                            <Trans i18nKey='authorization'/>
                                        </Nav.Link>}
                                        {(this.state.connect)&&<Nav.Link as={Link}  eventKey="5" className='mainNavText' to ='/Registration/disconnect'>
                                            <Trans i18nKey='deauthorization'/>
                                        </Nav.Link>}
                                    </Nav>
                                </Navbar.Collapse>
                                <Navbar.Collapse className="justify-content-end">
                                    <select value={this.state.language} id="languages" onChange={(e)=>this.setLanguage(e.target.value)}>
                                        <option value='en'>{i18n.t('english')}</option>
                                        <option value='ru'>{i18n.t('russian')}</option>
                                    </select>
                                    <Nav.Link target="_blank" as='a' href={lang === "ru" ? "https://docs.heo.finance/v/russian/" : "https://docs.heo.finance/"} className='upperNavText' id='helpBtn'><Trans i18nKey='help'/></Nav.Link>
                                </Navbar.Collapse>
                            </Container>
                        </Navbar>
                    </div>
                    <div>
                        <Modal onHide={()=>{}} show={this.state.showModal} className='myModal' centered>
                            <Modal.Body>
                                <p className='modalIcon'>
                                    {this.state.modalIcon === 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                                    {this.state.modalIcon === 'ExclamationTriangle' && <ExclamationTriangle/>}
                                    {this.state.modalIcon === 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                                    {this.state.modalIcon === 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                                </p>
                                <p className='modalTitle'><Trans i18nKey={this.state.modalTitle} /></p>
                                <p className='modalMessage'><Trans i18nKey={this.state.modalMessage} /></p>
                                {!this.state.waitToClose &&
                                <Button className='myModalButton'
                                        style={{
                                            backgroundColor: this.state.modalButtonVariant,
                                            borderColor: this.state.modalButtonVariant
                                        }}
                                        onClick={() => {
                                            if(this.state.onModalClose) {
                                                this.state.onModalClose();
                                            }
                                            this.setState({showModal: false, onModalClose: false});
                                        }}>
                                    <Trans i18nKey={this.state.modalButtonMessage} />
                                </Button>
                                }
                            </Modal.Body>
                        </Modal>
                        <Container  style={{ marginTop: '7em' }}>
                            <Switch>
                                <Route path="/campaign" component={CampaignPage} />
                                <Route path="/myCampaigns" component={UserCampaigns} />
                                <Route path="/new" component={CreateCampaign} />
                                <Route path="/rewards" component={MyDonations} />
                                <Route path="/editCampaign" component={EditCampaign} />
                                <Route path="/invest" component={TokenSale} />
                                <Route path="/registration"  component={Registration} onLeave={ () => { console.log("Registration on Leave") } }  />
                                <Route path="/404" component={Page404} />
                                <Route path="/" component={Home} />
                                <Route component={Error} />
                            </Switch>
                        </Container>
                    </div>
                </main>
            </Suspense>
            </UserContext.Provider>
        );
    }
}

export  default withRouter(App);

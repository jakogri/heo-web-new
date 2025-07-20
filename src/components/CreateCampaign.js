import React from 'react';
import countries from '../countries';
import {Container, Form, Col, Button, Image, Modal, Row} from 'react-bootstrap';
import {getCountryCodeForRegionCode} from 'awesome-phonenumber';
import ReactPlayer from 'react-player';
import { Link, withRouter } from "react-router-dom";
import uuid from 'react-uuid';
import axios from 'axios';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import {checkEmail,isValidUrl} from '../util/Utilities';
import {getEditorStateEn, getEditorStateRu, TextEditorEn, TextEditorRu, setEditorStateEn, setEditorStateRu} from '../components/TextEditor';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import '../css/createCampaign.css';
import '../css/modal.css';
import '../css/campaignPage.css';
//import TronWeb from "tronweb";
import ReactGA from "react-ga4";
ReactGA.initialize("G-C657WZY5VT");
class CreateCampaign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            whiteListed: false,
            loaderMessage:"Please wait",
            showError:false,
            showModal: false,
            showModalDialog: false,
            modalMessage:"",
            modalTitle:"",
            modalIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            fn:"",
            ln:"",
            orgEn:"",
            orgRu:"",
            cn:"International",
            vl:"",
            titleEn:"",
            titleRu:"",
            maxAmount:10000,
            coinbaseCommerceURL:"",
            descriptionEn :"",
            descriptionRu :"",
            raisedAmount:0,
            percentRaised: "0%",
            mainImageFile:"",
            qrCodeImageFile:"",
            waitToClose: false,
            goHome:false,
            getContent: false,
            editorContent: {},
            defDonationAmount: 10,
            fiatPayments: true,
            key: "",
            editorStateEn: "",
            editorStateRu: "",
            inTron:false,
            inEtherium:false,
            imgUrl:"",
            qrImgUrl:"",
            isInDB: false,
            campaignID: "",
            campaignData:{},
            line_accounts:{},
            addresses: {},
            email:"",
            countryCode:"",
            number:"",
            website:"",
            badWebsite:false,
            badKey:false,
            badEmail:false,
            noCountryCode:false,
            notValidAddr:false,
            noCoverImage:false,
            longDescRequired:false,
            longDescEnIncludRu:false,
            telegram:"",
            blockchain:"Tron",
            wallet:""
        }
        this.mistake = false;
    };

    onSubmit = (e) => {
        e.preventDefault();
        console.log("refresh prevented");
    };

    handleTextArea = (e) => {
        this.setState({description:e.target.value});
    };

    handleChange = e => {
        let help_value;
        let i;
        if((e.target.name === 'orgEn')||(e.target.name === 'titleEn')||(e.target.name === 'descriptionEn')||(e.target.name === 'descriptionEn')){
            help_value = '';  
            for(i = 0; i < e.target.value.length; i++){
             if (/^[А-Яа-я]*$/.test(e.target.value[i]) === false)
              help_value += e.target.value[i];
            }
            e.target.value = help_value;
            this.setState({ [e.target.name]: e.target.value });
            if(e.target.name === 'orgEn'){
                help_value = '';  
                for(i = 0; i <  e.target.value.length; i++){
                  if ((/^[A-Za-z0-9]*$/.test(e.target.value[i]) === true)||(e.target.value[i] === ' '))
                   help_value += e.target.value[i];
                }
                let key = help_value.toLowerCase().replaceAll(" ", "-"); 
                if((key !== "")&&(this.state.key === "")) this.setState({key: key}); 
            }
        }
        else if(e.target.name === 'countryCode') this.setState({ countryCode: e.target.value });
        else if(e.target.name === 'campaignURL'){
            help_value = '';  
            for(i = 0; i <  e.target.value.length; i++){
              if ((/^[-A-Za-z0-9]*$/.test(e.target.value[i]) === true)||(e.target.value[i] === ' '))
               help_value += e.target.value[i];
            }
            let key = help_value.toLowerCase().replaceAll(" ", "-"); 
            this.setState({key: key}); 
        }
        else if(e.target.name === 'number'){
            help_value = '';  
            for(let i = 0; i < e.target.value.length; i++){
             if ((/^[-0-9]*$/.test(e.target.value[i]) === true)||(e.target.value[i] === ' '))
              help_value += e.target.value[i];
            }
            e.target.value = help_value;
            this.setState({ [e.target.name]: e.target.value });
        }
        else if(e.target.name === 'wallet'){
            help_value = '';  
                for(i = 0; i <  e.target.value.length; i++){
                  if (/^[A-Za-z0-9]*$/.test(e.target.value[i]) === true)
                   help_value += e.target.value[i];
                }
                this.setState({wallet: help_value}); 
          }  
         else
          this.setState({ [e.target.name]: e.target.value });
    };

    fileSelected = e => {
        this.setState({mainImageFile:e.target.files[0], mainImageURL: URL.createObjectURL(e.target.files[0])});
    };

    qrfileSelected = e => {
        this.setState({qrCodeImageFile:e.target.files[0], qrCodeImageURL: URL.createObjectURL(e.target.files[0])});
    };

    async handleClick () {
        let imgID = uuid();
        let qrImgID = uuid();
        let result;
        this.mistake = false;
        try {
            if(this.state.orgEn.trim() === "") this.mistake = true;
            if(this.state.cn.trim() === "") this.mistake = true;
            if(this.state.website.trim() !== ""){
               result =  await isValidUrl(this.state.website);
               if(!result){
                this.setState({badWebsite:true});
                this.mistake = true; 
               }
            } 
            if(this.state.titleEn.trim() === "") this.mistake = true;
            if(this.state.descriptionEn.trim() === "") this.mistake = true;
            if(this.state.key.trim() === ""){
                this.setState(
                    {showModal:true, modalTitle: 'requiredFieldsTitle',
                        modalMessage: 'campaignURLRequired', modalIcon: 'ExclamationTriangle',
                        waitToClose: false,
                        modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                    });
                return false;
            }
            if(this.state.key.trim() !== ""){
                let data = {KEY : this.state.key};
                let res = await axios.post('/api/campaign/checkKey', data,
                                   {headers: {"Content-Type": "application/json"}});
                if (res.data === true) {
                    this.setState(
                        {showModal:true, modalTitle: 'requiredFieldsTitle',
                            modalMessage: 'campaignURLBad', modalIcon: 'ExclamationTriangle',
                            waitToClose: false,
                            modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                        });

                    return false; 
                }                        
            }
            if(this.state.email.trim() === "")this.mistake = true;
            if(this.state.email.trim() !== "" ){
                result = await checkEmail(this.state.email);
                if(!result){
                    this.setState({badEmail:true});
                    this.mistake = true;
                }
            }
            if ((this.state.number.trim() !== "")&&(this.state.countryCode.trim()==="")){
                this.setState({noCountryCode:true});
                this.mistake = true;
            }
            if (this.state.wallet.trim() === "") this.mistake = true;
            if ((this.state.blockchain === "Ethereum")&&(this.state.wallet.trim() !== "")){
                if((this.state.wallet.substring(0,2) !== "0x")||(this.state.wallet.length !== 42))
                 {
                    this.setState({notValidAddr:true});
                    this.mistake = true;
                 }
            }
            if ((this.state.blockchain === "Tron")&&(this.state.wallet.trim() !== "")){
                if((this.state.wallet.substring(0,1) !== "T")||(this.state.wallet.length !== 34))
                 {
                    this.setState({notValidAddr:true});
                    this.mistake = true;
                 }
            }
            let n = 0; 
            let EditorStateEn = await getEditorStateEn();
            if(!EditorStateEn){
                this.setState({longDescRequired:true});
                this.mistake = true;
            }
            if (EditorStateEn){
               for (let i = 0; i < EditorStateEn.blocks.length; i++){
                n = n + EditorStateEn.blocks[i].text.length; 
               }
               if (n < 3) {
                  this.setState({longDescRequired:true});
                  this.mistake = true;
               }
               for (let i = 0; i < EditorStateEn.blocks.length; i++){
                  for(let j = 0; j < getEditorStateEn().blocks[i].text.length; j++){
                    if (/^[А-Яа-я]*$/.test(getEditorStateEn().blocks[i].text[j]) === true){
                        this.setState({longDescEnIncludRu:true});
                        this.mistake = true;
                     }
                   } 
                }
            }
            let qrImgUrl = '';
            let imgUrl = await this.uploadImageS3('main', imgID);
            if (imgUrl) this.setState({imgUrl:imgUrl});
            else{
                this.setState({noCoverImage:true});
                this.mistake = true; 
            }
            if(this.state.qrCodeImageURL) {
              qrImgUrl = await this.uploadImageS3('qrCode', qrImgID);
              if(qrImgUrl) this.setState({qrImgUrl:qrImgUrl});
            }
            if(this.mistake === true) this.setState({showModalМistakes:true})
            else await this.addCampaignToDb();
        } catch(error)  {
            console.log(error);
        }
    }

    async addCampaignToDb() {
        try {
            let campaignData = {};
            campaignData.qrCodeImageUR = this.state.qrImgUrl;
            campaignData.mainImageURL = this.state.imgUrl;
            campaignData.key = this.state.key;
            campaignData.id = uuid();
            campaignData.title = {};
            campaignData.title["default"] = this.state.titleEn;
            campaignData.title["en"] = this.state.titleEn;
            campaignData.title["ru"] = this.state.titleRu;
            campaignData.description = {};
            campaignData.description["default"] = this.state.descriptionEn;
            campaignData.description["en"] = this.state.descriptionEn;
            campaignData.description["ru"] = this.state.descriptionRu;
            campaignData.maxAmount = this.state.maxAmount;
            campaignData.vl = this.state.vl;
            campaignData.fn = this.state.fn;
            campaignData.ln = this.state.ln;
            campaignData.org = {};
            campaignData.org["default"] = this.state.orgEn;
            campaignData.org["en"] = this.state.orgEn;
            campaignData.org["ru"] = this.state.orgRu;
            campaignData.cn = this.state.cn;
            campaignData.fiatPayments = true;
            let EditorStateEn = getEditorStateEn();
            let EditorStateRu = getEditorStateRu();
            this.state.editorStateEn = EditorStateEn;
            this.state.editorStateRu = EditorStateRu;
            campaignData.descriptionEditor = {};
            campaignData.descriptionEditor["default"] = this.state.editorStateEn;
            campaignData.descriptionEditor["en"] = this.state.editorStateEn;
            campaignData.descriptionEditor["ru"] = this.state.editorStateRu;
            campaignData.coinbaseCommerceURL = this.state.coinbaseCommerceURL;
            campaignData.defaultDonationAmount = parseInt(this.state.defDonationAmount,10);
            campaignData.fiatPayments = this.state.fiatPayments;
            campaignData.email = this.state.email;
            campaignData.countryCode = this.state.countryCode;
            campaignData.number = this.state.number;
            campaignData.telegram = this.state.telegram;
            campaignData.website = this.state.website;
            campaignData.payout_chain = this.state.blockchain;
            campaignData.payout_address = this.state.wallet;
           if(this.mistake === true) campaignData.complete = false;
            else campaignData.complete = true;
            let res = await axios.post('/api/campaign/add', {mydata : campaignData},
                {headers: {"Content-Type": "application/json"}});
            if (res.data === 'success'){
              if(this.mistake === true) {
                this.setState({showModal:true, goHome: true,
                    modalMessage: 'campaignSavedWithErrors',
                    modalTitle: 'success',
                    modalIcon: 'CheckCircle',
                    modalButtonMessage: 'ok',
                    modalButtonVariant: "#588157", waitToClose: false, isInDB: true,
                    campaignID: campaignData.id,
                    campaignData:campaignData 
                });
              } 
              else { 
                this.setState({showModal:true, goHome: true,
                    modalMessage: 'campaignSaved',
                    modalTitle: 'success',
                    modalIcon: 'CheckCircle',
                    modalButtonMessage: 'ok',
                    modalButtonVariant: "#588157", waitToClose: false, isInDB: true,
                    campaignID: campaignData.id,
                    campaignData:campaignData 
                });
              }  
            }    
            else{
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'failed',
                    modalMessage: 'errorWritingCampaignToDB',
                    modalIcon: 'CheckCircle',
                    modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false
                });
            }            
        } catch (err) {
            this.setState({showModal: true, goHome: false,
                modalTitle: 'failed',
                modalMessage: 'errorWritingCampaignToDB',
                modalIcon: 'CheckCircle',
                modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false
            });
            console.log('error adding campaign to the database ' + err.message);
        }
    }

    async uploadImageS3 (type, imgID) {
        this.setState(
            {showModal:true, modalTitle: 'processingWait',
            modalMessage: 'uploadingImageWait', modalIcon: 'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true
            });
        if(type === 'main' && (!this.state.mainImageFile || !this.state.mainImageFile.type)) {
            this.setState({noCoverImage:true, showModal:false});
            return false;
        }
        let fileType;
        const formData = new FormData();
        if(type === 'main') {
            fileType = this.state.mainImageFile.type.split("/")[1];
            formData.append(
                "myFile",
                this.state.mainImageFile,
                `${imgID}.${fileType}`,
            );
        } else if(type === 'qrCode') {
            fileType = this.state.qrCodeImageFile.type.split("/")[1];
            formData.append(
                "myFile",
                this.state.qrCodeImageFile,
                `${imgID}.${fileType}`,
            );
        }
        try {
            let res = await axios.post('/api/uploadimage', formData);
            if((res)&&(res.data)) {
                this.setState({showModal:false});
                return (res.data);
            } else {
                this.setState({noCoverImage:true, showModal:false});
                return false;
            }
        }  catch(err) {
            if (err.response) {
                console.log('response error in uploading main image- ' + err.response.status);
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'technicalDifficulties',
                    modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if (err.request) {
                console.log('No response in uploading main image' + err.message);
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'checkYourConnection',
                    modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else {
                console.log('error uploading image ' + err.message);
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'imageUploadFailed',
                    modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }
            return false;
        }
    }

    render() {
        return (
            <div>
               <Modal size='xl' show={this.state.showModalМistakes} onHide={()=>{}} className='myModal' centered>
               <Modal.Body className='createFormPlaceHolder'> 
                <p className='modalIcon'><ExclamationTriangle/></p>
                <Row class="justify-content-center">
                <Col class="my-auto">
                <p className='modalTitle'><Trans i18nKey={'requiredFieldsTitle'}/></p>  
                </Col>
                </Row> 
                <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                <Container fluid>
                {(this.state.orgEn === "")&&<Row><p><Trans i18nKey={'orgRequiredEn'}/></p></Row>}   
                {(this.state.cn === "")&&<Row><p><Trans i18nKey={'cnRequired'}/></p></Row>} 
                {(this.state.badWebsite === true)&&<Row><p><Trans i18nKey={'badWebsite'}/></p></Row>}
                {(this.state.titleEn === "")&&<Row><p><Trans i18nKey={'titleRequired'}/></p></Row>} 
                {(this.state.descriptionEn === "")&&<Row><p><Trans i18nKey={'shortDescRequired'}/></p></Row>}
                {(this.state.email === "")&&<Row><p><Trans i18nKey={'emailRequired'}/></p></Row>}
                {(this.state.badEmail === true)&&<Row><p><Trans i18nKey={'emailFaulty'}/></p></Row>}
                {(this.state.noCountryCode === true)&&<Row><p><Trans i18nKey={'countryCodeRequired'}/></p></Row>}
                {(this.state.wallet === "")&&<Row><p><Trans i18nKey={'enterWallet'}/></p></Row>}
                {(this.state.notValidAddr === true)&&<Row><p><Trans i18nKey={'notValidAddr'}/></p></Row>}
                {(this.state.longDescRequired === true)&&<Row><p><Trans i18nKey={'longDescRequired'}/></p></Row>}
                {(this.state.longDescEnIncludRu === true)&&<Row><p><Trans i18nKey={'longDescEnIncludRu'}/></p></Row>}
                {(this.state.noCoverImage=== true)&&<Row><p><Trans i18nKey={'coverImageRequired'}/></p></Row>}
                </Container>
                <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                <Row>
                <Col>    
                <Button className='myModalButton' 
                  style={{backgroundColor : "#E63C36", borderColor : "#E63C36"}}
                  onClick={ async () => { this.setState({showModalМistakes:false,badWebsite:false,badKey:false,badEmail:false,
                    noCountryCode:false,notValidAddr:false,noCoverImage:false,longDescRequired:false,longDescEnIncludRu:false});
                   await this.addCampaignToDb();
                   this.props.history.push("/myCampaigns");
                  }} >
                  <Trans i18nKey={'saveCampaignBtn'} />  
                 </Button>  
                 </Col>
                 <Col>
                 <Button className='myModalButton' 
                  style={{backgroundColor : "#E63C36", borderColor : "#E63C36"}}
                  onClick={ async () => { this.setState({showModalМistakes:false,badWebsite:false,badKey:false,badEmail:false,
                    noCountryCode:false,notValidAddr:false,noCoverImage:false,longDescRequired:false,longDescEnIncludRu:false});
                  }} >
                  <Trans i18nKey={'abortBtn'} />  
                 </Button>  
                 </Col>
                 </Row>
                 </Modal.Body>
               </Modal>  
               <Modal size='xl' show={this.state.showModalPrevent} onHide={()=>{}} className='myModal' centered>
               <Modal.Body className='createFormPlaceHolder'> 
                <Row class="justify-content-center">
                <Col class="my-auto">
                <p className='modalTitle'><Trans i18nKey={'preventionTitle'}/></p>  
                </Col>
                </Row> 
                <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                <Container fluid>
                <Row>
                 <Col xs lg="1"><p>1</p></Col> 
                 <Col><p><Trans i18nKey={'prevention1'}/></p></Col>  
                </Row> 
                <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                <Row>
                 <Col xs lg="1">2</Col> 
                 <Col><p><Trans i18nKey={'prevention2'}/></p></Col>  
                </Row> 
                <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                <Row>
                 <Col xs lg="1">3</Col> 
                 <Col><p><Trans i18nKey={'prevention3'}/></p></Col>  
                </Row> 
                </Container>
                <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                <Button className='myModalButton' 
                  style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                  onClick={ async () => { this.setState({showModalPrevent:false});
                  }} >
                  <Trans i18nKey={'ok'} />  
                 </Button>  
                 </Modal.Body>
                </Modal>  
               <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
                    <Modal.Body><p className='modalIcon'>
                        {this.state.modalIcon === 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.modalIcon === 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.modalIcon === 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.modalIcon === 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'><Trans i18nKey={this.state.modalMessage}>
                            Your account has not been cleared to create campaigns.
                            Please fill out this
                            <a target='_blank' rel="noopener noreferrer" href='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</a>
                            to ne granted permission to fundraise on HEO Platform
                        </Trans></p>
                       { !this.state.waitToClose &&
                        <Button className='myModalButton' style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ async () => {this.setState({showModal:false}); if(this.state.goHome) this.props.history.push('/');}}>
                         <Trans i18nKey={this.state.modalButtonMessage} />  
                        </Button>}
                    </Modal.Body> 
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <Link className={"backToCampaignsLink"} to="/"><span><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToCampaigns'/></span></Link>
                </Container>
                <Container en id='mainContainer'>
                    <Form onSubmit={this.onSubmit}>
                        <div className='titles'><Trans i18nKey='aboutYou'/></div>
                        <Form.Group>
                        <Form.Label><Trans i18nKey='organization'/><span className='redAsterisk'>*</span></Form.Label>
                            <Row>
                            <Col>  
                            <Form.Label><Trans i18nKey='english'/><span className='redAsterisk'>*</span></Form.Label>
                            </Col>
                            <Col> 
                            <Form.Label><Trans i18nKey='russian'/><span className='redAsterisk'></span></Form.Label> 
                            </Col>
                            </Row>
                            <Row>
                            <Col>  
                            <Form.Control required type="text" className="createFormPlaceHolder" placeholder={i18n.t('on')}
                                name='orgEn' value={this.state.orgEn} onChange={this.handleChange}/>
                            </Col>
                            <Col> 
                            <Form.Control required type="text" className="createFormPlaceHolder" placeholder={i18n.t('on')}
                                name='orgRu' value={this.state.orgRu} onChange={this.handleChange}/>  
                            </Col>
                            </Row>     
                        </Form.Group>
                        <Form.Group>
                                <Form.Label><Trans i18nKey='selectConuntry'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control as="select" name='cn' value={this.state.cn} onChange={this.handleChange}>
                                    {countries.map((data) =>
                                        <option value={data.value}>{data.text}</option>
                                    )}
                                </Form.Control>
                        </Form.Group>
                        <Form.Group> 
                          <Form.Label>{i18n.t('website')}</Form.Label>
                          <Form.Control required type="text" className="createFormPlaceHolder" value={this.state.website}
                            placeholder={i18n.t('website')} name='website' onChange={this.handleChange}/>
                        </Form.Group> 
                        <div className='titles'><Trans i18nKey='campaignDetails'/></div>
                        <Form.Group>
                            <Form.Group> 
                            <Form.Label>{i18n.t('howMuchYouNeed')}<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.maxAmount} placeholder={this.state.maxAmount}
                                          name='maxAmount' onChange={this.handleChange} onwheel="this.blur()" />
                            </Form.Group> 
                            <Form.Group>             
                            <Form.Label><Trans i18nKey='defDonationAmount'/><span
                                className='redAsterisk'></span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.defDonationAmount} placeholder={this.state.defDonationAmount}
                                          name='defDonationAmount' onChange={this.handleChange} onwheel="this.blur()" />
                            </Form.Group>
                            <Form.Group>
                            <Row>
                            <Col xs="auto">
                            <Form.Label><Trans i18nKey='fiatPayments'/><span
                                className='redAsterisk'></span></Form.Label>
                            </Col>
                            <Col xs lg="1">
                            <Form.Check type="checkbox" checked={false}
                                        value={this.state.fiatPayments} placeholder={this.state.fiatPayments}
                                        name='fiatPayments' onwheel="this.blur()" readOnly = {true}/>
                            </Col>
                            </Row> 
                            </Form.Group>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='selectCoverImage'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Label><span className='optional'>(<Trans i18nKey='coverImageHint'/>)</span></Form.Label>
                            <Form.File
                                name='imageFile' className="position-relative" required
                                id="campaignImgInput" accept='.jpg,.png,.jpeg,.gif'
                                onChange={this.fileSelected}
                            />
                        </Form.Group>
                        <Image id='createCampaignImg' src={this.state.mainImageURL}/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='promoVideo'/> <span
                                className='optional'>(<Trans i18nKey='optional'/>)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder"
                                          placeholder={i18n.t('linkToYouTube')}
                                          name='vl' value={this.state.vl} onChange={this.handleChange}/>
                        </Form.Group>
                        {this.state.vl !== "" && <ReactPlayer url={this.state.vl} id='createCampaignVideoPlayer'/>}
                        <Form.Group>
                        <Form.Label><Trans i18nKey='title'/><span className='redAsterisk'>*</span></Form.Label>
                            <Row>
                            <Col>  
                            <Form.Label><Trans i18nKey='english'/><span className='redAsterisk'>*</span></Form.Label>
                            </Col>
                            <Col> 
                            <Form.Label><Trans i18nKey='russian'/><span className='redAsterisk'></span></Form.Label> 
                            </Col>
                            </Row>
                            <Row>
                            <Col>
                            <Form.Control required type="text" className="createFormPlaceHolder"
                                          placeholder={i18n.t('campaignTitle')}
                                          name='titleEn' value={this.state.titleEn} onChange={this.handleChange}/>
                            </Col>
                            <Col>
                            <Form.Control required type="text" className="createFormPlaceHolder"
                                          placeholder={i18n.t('campaignTitle')}
                                          name='titleRu' value={this.state.titleRu} onChange={this.handleChange}/>
                            </Col>
                            </Row>            
                        </Form.Group>
                        <Form.Group>
                        <Form.Label><Trans i18nKey='shortDescription'/><span className='redAsterisk'>*</span></Form.Label>
                            <Row>
                            <Col>  
                            <Form.Label><Trans i18nKey='english'/><span className='redAsterisk'>*</span></Form.Label>
                            </Col>
                            <Col> 
                            <Form.Label><Trans i18nKey='russian'/><span className='redAsterisk'></span></Form.Label> 
                            </Col>
                            </Row>
                            <Row>
                            <Col>
                            <Form.Control required as="textarea" rows={3} className="createFormPlaceHolder"
                                          placeholder={i18n.t('descriptionOfCampaign')}
                                          name='descriptionEn' value={this.state.descriptionEn}
                                          maxLength='195' onChange={this.handleChange}/>
                            </Col>    
                            <Col>
                            <Form.Control required as="textarea" rows={3} className="createFormPlaceHolder"
                                          placeholder={i18n.t('descriptionOfCampaign')}
                                          name='descriptionRu' value={this.state.descriptionRu}
                                          maxLength='195' onChange={this.handleChange}/>
                            </Col>  
                            </Row>
                            <Form.Label><Trans i18nKey='campaignDescription'/><span className='redAsterisk'>*</span></Form.Label>
                            <Row>
                            <Col>  
                            <Form.Label><Trans i18nKey='english'/><span className='redAsterisk'>*</span></Form.Label>
                            </Col>
                            <Col> 
                            <Form.Label><Trans i18nKey='russian'/><span className='redAsterisk'></span></Form.Label> 
                            </Col>
                            </Row> 
                            <Row>
                            <Col>
                            <TextEditorEn />
                            </Col>  
                            <Col>
                            <TextEditorRu />
                            </Col>   
                            </Row>
                         <Form.Group>
                         <Form.Label><Trans i18nKey='campaignURL'/><span className='redAsterisk'>*</span></Form.Label>  
                         <Form.Control required type="text" className="createFormPlaceHolder"
                           placeholder={i18n.t('campaignURLPlaceHolder')} name='campaignURL' value={this.state.key} onChange={this.handleChange}/>
                         </Form.Group>
                         </Form.Group> 
                        <div className='titles'><Trans i18nKey='contactInform'/></div>
                        <Form.Group>
                         <Form.Group>  
                          <Form.Label><Trans i18nKey='email'/><span className='redAsterisk'>*</span></Form.Label>
                          <Form.Control required type="text" className="createFormPlaceHolder"
                           placeholder={i18n.t('contactPlaceHolder')} name='email' value={this.state.email} onChange={this.handleChange}/>
                         </Form.Group>
                         <Form.Group>  
                          <Form.Label><Trans i18nKey='phoneNumber'/></Form.Label>
                          <Row>
                            <Col xs = {5}>  
                            <Form.Label><Trans i18nKey='countryCode'/><span className='redAsterisk'></span></Form.Label>
                            </Col>
                            <Col xs={7}> 
                            <Form.Label><Trans i18nKey='number'/><span className='redAsterisk'></span></Form.Label> 
                            </Col>
                          </Row>
                          <Row>
                           <Col xs = {5}>
                           <Form.Control required as="select" name='countryCode' value={this.state.countryCode} onChange={this.handleChange}>
                                <option> </option>
                                {countries.map((data) => 
                                   <option disabled={getCountryCodeForRegionCode(data.value) === 0} value={"+" + getCountryCodeForRegionCode(data.value)} >{data.text} {"+" + getCountryCodeForRegionCode(data.value)}</option>
                                    )}
                                </Form.Control>
                           </Col> 
                           <Col xs={7}>
                            <Form.Control required type="text" className="createFormPlaceHolder"
                             placeholder={i18n.t('contactPlaceHolder')} name='number' value={this.state.n} onChange={this.handleChange}/>
                           </Col>  
                          </Row> 
                         </Form.Group>  
                         <Form.Group>  
                          <Form.Label>Telegram</Form.Label>
                          <Form.Control required type="text" className="createFormPlaceHolder"
                           placeholder={i18n.t('contactPlaceHolder')} name='telegram' value={this.state.telegram} onChange={this.handleChange}/>
                         </Form.Group>  
                         <Form.Group>  
                          <Form.Label><Trans i18nKey='payout'/></Form.Label>
                          <Row>
                            <Col xs = {2}>  
                            <Form.Label><Trans i18nKey='blockchain'/><span className='redAsterisk'>*</span></Form.Label>
                            </Col>
                            <Col xs={10}> 
                            <Form.Label><Trans i18nKey='wallet'/><span className='redAsterisk'>*</span></Form.Label> 
                            </Col>
                          </Row>
                          <Row>
                          <Col xs = {2}>
                           <Form.Control required type="text" className="createFormPlaceHolder"
                             placeholder="" name='blockchain' value={this.state.blockchain} readOnly = {true}/>
                           </Col> 
                           <Col xs={10}>
                            <Form.Control required type="text" className="createFormPlaceHolder"
                             placeholder={i18n.t('contactPlaceHolder')} name='wallet' value={this.state.wallet} onChange={this.handleChange}/>
                           </Col>  
                          </Row> 
                         </Form.Group>           
                        </Form.Group>
                        <Row>
                          <Col>    
                           <Button onClick={() => this.handleClick()} id='createCampaignBtn' name='ff3'>
                            {i18n.t('createCampaignBtn')}
                           </Button>
                          </Col>
                        </Row>
                        <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                    </Form>
                </Container>
                
            </div>
        );
    }

    async componentDidMount() {
        setEditorStateEn({}, false);
        setEditorStateRu({}, false);
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        this.setState({
                isLoggedIn : false,
                whiteListed: false
               });
        this.setState({showModalPrevent: true});
    }
}
export default withRouter(CreateCampaign);

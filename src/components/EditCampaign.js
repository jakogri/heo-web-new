import React from 'react';
import countries from '../countries';
import {Container, Form, Col, Button, Image, Modal, Row} from 'react-bootstrap';
import ReactPlayer from 'react-player';
import {getCountryCodeForRegionCode} from 'awesome-phonenumber';
import config from "react-global-configuration";
import axios from 'axios';
import { Trans } from 'react-i18next';
import uuid from 'react-uuid';
import i18n from '../util/i18n';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { getEditorStateEn, getEditorStateRu, TextEditorEn, TextEditorRu, setEditorStateEn, setEditorStateRu, editorStateHasChangedRu,
        editorStateHasChangedEn } from '../components/TextEditor';
import { initWeb3Modal, initTronadapter, checkEmail, isValidUrl, countWordsString} from '../util/Utilities';
import '../css/createCampaign.css';
import '../css/modal.css';
import ReactGA from "react-ga4";

ReactGA.initialize("G-C657WZY5VT");

class EditCampaign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showLoader:false,
            loaderMessage:"Please wait",
            showError:false,
            showModal: false,
            modalMessage:"",
            modalIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            fn:"",
            ln:"",
            orgEn:"",
            orgRu:"",
            ogOrg:{},
            cn:"",
            vl:"",
            titleEn:"",
            titleRu:"",
            ogTitle:{},
            descriptionEn:"",
            descriptionRu:"",
            ogDescription:{},
            ogDescriptionEditor:{},
            mainImageURL: "",
            imgID:"",
            mainImageFile:"",
            waitToClose: false,
            maxAmount:0,
            maxAmount_old:0,
            updateImage: false,
            updateMeta: false,
            campaignId: "",
            currentError:"",
            updatedEditorStateEn: false,
            updatedEditorStateRu: false,
            chains:{},
            accounts:{},
            line_accounts:{},
            addresses: {},
            defDonationAmount: 0,
            fiatPayments: true,
            key: "",
            chainId:"",
            tronChainId:"",
            badWebsite:false,
            badKey:false,
            badEmail:false,
            noCountryCode:false,
            notValidAddr:false,
            noCoverImage:false,
            longDescRequired:false,
            longDescEnIncludRu:false,
            email:"",
            countryCode:"",
            number:"",
            website:"",
            telegram:"",
            blockchain:"",
            wallet:""
        };

    }

   onSubmit = (e) => {
        e.preventDefault();
        console.log("refresh prevented");
    };

    handleTextArea = (e) => {
        this.setState({description:e.target.value, updateMeta : true});
    }

    handleChange = (e) => {
        let help_value;
        const name = e.target.name
        const value = e.target.value;
        const checked = e.target.checked;
       if(e.target.name === 'number'){
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
                for(let i = 0; i <  e.target.value.length; i++){
                  if (/^[A-Za-z0-9]*$/.test(e.target.value[i]) === true)
                   help_value += e.target.value[i];
                }
                this.setState({wallet: help_value}); 
        }    
        else
        this.setState({ [name] : value, updateMeta : true });
    }

    fileSelected = e => {
        this.setState({
            mainImageFile:e.target.files[0],
            mainImageURL: URL.createObjectURL(e.target.files[0]),
            updateImage : true, updateMeta : true
        });
    }

    handleClick = async () => {
        let imgID;
        if(this.state.imgID === "") imgID = this.state.imgID
        else imgID = uuid();
        let result;
        this.mistake = false;
        try{
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
                n = n + countWordsString(EditorStateEn.blocks[i].text); 
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
            var newImgUrl = this.state.mainImageURL;
            if(this.state.updateImage) {
                newImgUrl = await this.uploadImageS3('main', imgID);
                if(!newImgUrl) {
                    this.setState({noCoverImage:true});
                    this.mistake = true;
                }
                else this.setState({mainImageURL: newImgUrl});
            }
            else if(this.state.mainImageURL === "") {
                this.setState({noCoverImage:true});
                this.mistake = true;
            }
            
            if(this.mistake === true) this.setState({showModalМistakes:true})
            else{
                result = await this.updateCampaign();
                if (result === false)
                    this.setState({showModal : true,
                            modalTitle: 'failed',
                            modalMessage: 'errorWritingCampaignToDB',
                            modalIcon:'XCircle', modalButtonMessage: 'closeBtn',
                            modalButtonVariant: "#E63C36", waitToClose: false});
                else this.setState({
                        showModal: true, modalTitle: 'complete', goHome: true,
                        modalMessage: 'updateSuccessfull',
                        modalIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: '#588157', waitToClose: false
                });
            } 
        } catch(error)  {
            console.log(error);
        }
    }

    async updateCampaign() {
        try {
            let data = {
                mainImageURL: this.state.mainImageURL,
                fn: this.state.fn,
                ln: this.state.ln,
                cn: this.state.cn,
                vl: this.state.vl,
                defaultDonationAmount: this.state.defDonationAmount,
                fiatPayments: this.state.fiatPayments,
            };
            data.key = this.state.key;
            data.description = this.state.ogDescription;
            data.description["en"] = this.state.descriptionEn;
            data.description["ru"] = this.state.descriptionRu;
            data.description["default"] = this.state.descriptionEn;
            data.title = this.state.ogTitle;
            data.title["en"] = this.state.titleEn;
            data.title["ru"] = this.state.titleRu;
            data.title["default"] = this.state.titleEn;
            data.descriptionEditor = this.state.ogDescriptionEditor;
            data.email = this.state.email;
            data.countryCode = this.state.countryCode;
            data.number = this.state.number;
            data.telegram = this.state.telegram;
            data.website = this.state.website;
            if (editorStateHasChangedEn()){
              let EditorStateEn = await getEditorStateEn();
              data.descriptionEditor["en"] = EditorStateEn;
              data.descriptionEditor["default"] = EditorStateEn;
            }
            if (editorStateHasChangedRu()){
                let EditorStateRu = await getEditorStateRu();
                data.descriptionEditor["ru"] = EditorStateRu;
            }
            data.maxAmount = this.state.maxAmount;
            data.org = this.state.ogOrg;
            data.org["en"] = this.state.orgEn;
            data.org["default"] = this.state.orgEn;
            data.org["ru"] = this.state.orgRu;
            data.payout_chain = this.state.blockchain;
            data.payout_address = this.state.wallet;
            if(this.mistake === true) data.complete = false;
            else data.complete = true;
           let dataForDB = {address: this.state.campaignId, dataToUpdate: data};
            try {
               let res = await axios.post('/api/campaign/update', {mydata : dataForDB},
                 {headers: {"Content-Type": "application/json"}});
                 if (res.data !== 'success') return (false);
            } catch (err) {
               console.log(err);
               if(err.response) {
                   this.setState({currentError : 'technicalDifficulties'});
               } else if (err.request) {
                   this.setState({currentError : 'checkYourConnection'});
               } else {
                   this.setState({currentError : ''});
               }
               return false;
            }
            return true;
        }catch(err){
            console.log(err);
            return (false);
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
                    var result = await this.updateCampaign();
                    if (result === false)
                        this.setState({showModal : true,
                                modalTitle: 'failed',
                                modalMessage: 'errorWritingCampaignToDB',
                                modalIcon:'XCircle', modalButtonMessage: 'closeBtn',
                                modalButtonVariant: "#E63C36", waitToClose: false});
                    else this.setState({
                            showModal: true, modalTitle: 'complete', goHome: true,
                            modalMessage: 'updateSuccessfull',
                            modalIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                            modalButtonVariant: '#588157', waitToClose: false
                    });
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
                <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
                    <Modal.Body><p className='modalIcon'>
                        {this.state.modalIcon === 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.modalIcon === 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.modalIcon === 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.modalIcon === 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'><Trans i18nKey={this.state.modalMessage}/></p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton'
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ () => {
                                if (this.state.resultEtherium === false){
                                 this.setState({showModal : true,
                                    modalTitle: 'failed',
                                    modalMessage: 'updatingAmountFailedEtherium',
                                    modalIcon:'XCircle', modalButtonMessage: 'closeBtn',
                                    modalButtonVariant: "#E63C36", waitToClose: false, resultEtherium:true});
                                }
                                else if (this.state.resultTron === false){
                                    this.setState({showModal : true,
                                       modalTitle: 'failed',
                                       modalMessage: 'updatingAmountFailedTron',
                                       modalIcon:'XCircle', modalButtonMessage: 'closeBtn',
                                       modalButtonVariant: "#E63C36", waitToClose: false, resultTron:true});
                                   }
                                else this.setState({showModal:false});
                            }}>
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <Link className={"backToCampaignsLink"} to="/myCampaigns"><span><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToMyCampaigns'/></span></Link>
                </Container>
                <Container id='mainContainer'>
                    <Form onSubmit={this.onSubmit}>
                        <div className='titles'> <Trans i18nKey='aboutYou'/> </div>
                        <Form.Group >
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
                        <Form.Group as={Col}>
                                <Form.Label><Trans i18nKey='selectConuntry'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required as="select" name='cn' value={this.state.cn} onChange={this.handleChange} >
                                {countries.map( (data)=>
                                    <option value={data.value}>{data.text}</option>
                                )}
                                </Form.Control>
                        </Form.Group>
                        <Form.Group>
                          <Form.Label>{i18n.t('website')}</Form.Label>
                          <Form.Control required type="text" className="createFormPlaceHolder" value={this.state.website}
                            placeholder={i18n.t('website')} name='website' onChange={this.handleChange}/>
                        </Form.Group>
                        <div className='titles'> <Trans i18nKey='campaignDetails'/></div>
                        <Form.Group>
                            <Form.Label>{i18n.t('howMuchYouNeed')}<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.maxAmount} placeholder={this.state.maxAmount}
                                          name='maxAmount' onChange={this.handleChange}/>
                            <Form.Label><Trans i18nKey='defDonationAmount'/><span
                                className='redAsterisk'></span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.defDonationAmount} placeholder={this.state.defDonationAmount}
                                          name='defDonationAmount' onChange={this.handleChange} onwheel="this.blur()" />
                            <Row>
                            <Col xs="auto">
                            <Form.Label><Trans i18nKey='fiatPayments'/><span
                                className='redAsterisk'></span></Form.Label>
                            </Col>
                            <Col xs lg="1">
                            <Form.Check type="checkbox" checked={this.state.fiatPayments}
                                        value={this.state.fiatPayments} placeholder={this.state.fiatPayments}
                                        name='fiatPayments' onwheel="this.blur()" readOnly = {true}/>
                            </Col>
                            </Row>
                        </Form.Group>
                        <hr/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='selectCoverImage'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Label><span className='optional'>(<Trans i18nKey='coverImageHint'/>)</span></Form.Label>
                            <Form.File
                                name='imageFile' className="position-relative"
                                id="campaignImgInput" accept='.jpg,.png,.jpeg,.gif'
                                onChange={this.fileSelected}
                            />
                        </Form.Group>
                        <Image id='createCampaignImg' src={this.state.mainImageURL}/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='promoVideo'/> <span className='optional'>(<Trans i18nKey='optional'/>)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder={i18n.t('linkToYouTube')}
                                name='vl' value={this.state.vl} onChange={this.handleChange}/>
                        </Form.Group>
                        { this.state.vl !== "" && <ReactPlayer url={this.state.vl} id='createCampaignVideoPlayer' />}
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
                            {this.state.updatedEditorStateEn && <TextEditorEn  />}
                            </Col>
                            <Col>
                            {this.state.updatedEditorStateRu && <TextEditorRu  />}
                            </Col>
                            </Row>
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
                             placeholder={i18n.t('contactPlaceHolder')} name='number' value={this.state.number} onChange={this.handleChange}/>
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
                         <Button onClick={() => this.handleClick()} id='createCampaignBtn' name='ff3'>{i18n.t('saveCampaignBtn')}</Button>
                        </Row>
                        <Row><Col><Button style={{backgroundColor : "white", borderColor : "white"}}></Button></Col></Row>
                    </Form>
                </Container>
            </div>
        );
    }

    async getCampaignFromDB(id) {
        var campaign = {};
        var modalMessage = 'failedToLoadCampaign';
        let data = {ID : id};
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
                    modalMessage,
                })
            })

        return campaign;
    }

    async componentDidMount() {
        let chainId = config.get("CHAIN");
        let tronChainId = config.get("TRON_CHAIN");
        if(window.ethereum) await initWeb3Modal(chainId, this);
        if(window.tron) await initTronadapter();
        this.setState({
                chainId: chainId,
                tronChainId: tronChainId,
               });
        var id;
        var modalMessage = 'failedToLoadCampaign';
        let toks = this.props.location.pathname.split("/");
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        let key = toks[toks.length -1];
        let data = {KEY : key};
        await axios.post('/api/campaign/getid', data, {headers: {"Content-Type": "application/json"}})
            .then(res => {
                id = res.data;
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
        let dbCampaignObj = await this.getCampaignFromDB(id);
        var orgObj = {};
        if(typeof dbCampaignObj.org == "string") {
            if ( dbCampaignObj.org.en) orgObj["en"] =  dbCampaignObj.org.en;
            else  orgObj["en"] = "";
            if ( dbCampaignObj.org.en) orgObj["ru"] =  dbCampaignObj.org.en;
            else  orgObj["ru"] = "";
        } else {
            orgObj = dbCampaignObj.org;
        }
        var titleObj = {};
        if(typeof dbCampaignObj.title == "string") {
            if ( dbCampaignObj.title.en) titleObj["en"] =  dbCampaignObj.title.en;
            else  titleObj["en"] = "";
            if ( dbCampaignObj.title.ru) titleObj["ru"] =  dbCampaignObj.title.ru;
            else  titleObj["ru"] = "";
        } else {
            titleObj = dbCampaignObj.title;
        }
        var descriptionObj = {};
        if(typeof dbCampaignObj.description == "string") {
            if ( dbCampaignObj.description.en) descriptionObj["en"] =  dbCampaignObj.description.en;
            else  descriptionObj["en"] = "";
            if ( dbCampaignObj.description.ru) descriptionObj["ru"] =  dbCampaignObj.description.ru;
            else  descriptionObj["ru"] = "";
        } else {
            descriptionObj = dbCampaignObj.description;
        }
        this.setState({
            campaignId : id,
            fn : dbCampaignObj.fn,
            ln : dbCampaignObj.ln,
            cn : dbCampaignObj.cn,
            vl : dbCampaignObj.vl,
            active : dbCampaignObj.active,
            imgID: dbCampaignObj.imgID,
            orgRu: orgObj["ru"],
            orgEn:orgObj["en"],
            ogOrg: orgObj,
            ogDescriptionEditor:dbCampaignObj.descriptionEditor,
             titleRu: titleObj["ru"],
            titleEn: titleObj["en"],
            ogTitle: titleObj,
            descriptionRu: descriptionObj["ru"],
            descriptionEn: descriptionObj["en"],
            ogDescription: descriptionObj,
            mainImageURL: dbCampaignObj.mainImageURL,
            maxAmount : dbCampaignObj.maxAmount,
            maxAmount_old : dbCampaignObj.maxAmount,
            addresses: dbCampaignObj.addresses,
            defDonationAmount: dbCampaignObj.defaultDonationAmount,
            fiatPayments: dbCampaignObj.fiatPayments
        });
        if (dbCampaignObj.payout_chain) this.setState({blockchain:dbCampaignObj.payout_chain});  
        if (dbCampaignObj.payout_address) this.setState({wallet:dbCampaignObj.payout_address});   
        if(dbCampaignObj.descriptionEditor.en){
            setEditorStateEn(dbCampaignObj.descriptionEditor.en, true);
            this.setState({updatedEditorStateEn : true});
        }
        else{
            setEditorStateEn({}, false);
            this.setState({updatedEditorStateEn : true});
        }
        if(dbCampaignObj.descriptionEditor.ru){
            setEditorStateRu(dbCampaignObj.descriptionEditor.ru, true);
            this.setState({updatedEditorStateRu : true});
        }
        else{
            setEditorStateRu({}, false);
            this.setState({updatedEditorStateRu : true});
        }
        if (dbCampaignObj.key)
          this.setState({key : dbCampaignObj.key});
        if (dbCampaignObj.email)
          this.setState({email : dbCampaignObj.email});
        if (dbCampaignObj.countryCode)
          this.setState({countryCode : dbCampaignObj.countryCode});
        if (dbCampaignObj.number)
          this.setState({number : dbCampaignObj.number});
        if (dbCampaignObj.website)
          this.setState({website : dbCampaignObj.website});
        if (dbCampaignObj.telegram)
          this.setState({telegram : dbCampaignObj.telegram});
    }
}

export default EditCampaign;

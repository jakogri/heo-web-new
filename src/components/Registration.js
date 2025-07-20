import React from 'react';
import {Form, Col, Button, Modal, Row} from 'react-bootstrap';
import axios from 'axios';
import { Trans } from 'react-i18next';
import { CheckCircle, ExclamationTriangle, HourglassSplit, XCircle, InfoCircle } from 'react-bootstrap-icons';
import '../css/createCampaign.css';
import '../css/modal.css';
import ReactGA from "react-ga4";
ReactGA.initialize("G-C657WZY5VT");

class Registration extends React.Component {
    
    constructor(props){
        super(props);
        this.state = {
          showModal: false,
          modalTitle: '',
          showModalRegistr: false,
          showModalConnect: false,
          showModalDisconnect: false,
          showModalCode: false,
          modalIcon: '',
          email: '',
          password: '',
          repeetpass: '',
          confcode: '',
          key: '',
          waitToClose: false,
          changePass: false
        };
    };

    async deAutorisation(){
      this.setState(
        {showModal:true, modalTitle: 'processingWait',
        modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
        modalButtonVariant: "gold", waitToClose: true
        }); 
     let res = await axios.post('/api/auth/deautor',
                          {headers: {"Content-Type": "application/json"}});
      if ((res.data.success)&&(res.data.success === true)) {
        this.setState({showModal: true, goHome: true,
              modalTitle: 'success',
              modalMessage: 'deauthorizationComplete',  showModalDisconnect:false,
              modalIcon: 'CheckCircle',
              showModalCode: false,
              modalButtonMessage: 'returnHome',
              modalButtonVariant: "#588157", waitToClose: false
        }); 
      }
    }  

    async startChangePassword(){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          });
        if(!this.state.email) {
          this.setState(
              {showModal:true, modalTitle: 'requiredFieldsTitle',
                  modalMessage: 'emailRequired', modalIcon: 'ExclamationTriangle',
                  waitToClose: false,
                  modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
              });
          return false;
        }
        let userData = {};
        userData.to_email = this.state.email;
        let res = await axios.post('/api/auth/change_pass', {mydata : userData},
                           {headers: {"Content-Type": "application/json"}}); 
        if(res.data === 'no_user'){
         this.setState(
           {showModal:true, modalTitle: 'failed',
               modalMessage: 'noUser', modalIcon: 'ExclamationTriangle',
               waitToClose: false,
               modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
         });
         return (false);  
        }    
        this.setState({showModal: true, modalTitle: "attention", modalMessage: 'sendcode',
           modalIcon: 'InfoCircle', 
           modalButtonMessage: 'ok',
           modalButtonVariant: "#588157", waitToClose: false, changePass:true
        });                   
      }catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorChangePassword',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'ok',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    }

    async startAuthorization(){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          });
        if(!this.state.email) {
          this.setState(
              {showModal:true, modalTitle: 'requiredFieldsTitle',
                  modalMessage: 'emailRequired', modalIcon: 'ExclamationTriangle',
                  waitToClose: false,
                  modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
              });
          return false;
        }
        if(!this.state.password) {
          this.setState(
              {showModal:true, modalTitle: 'requiredFieldsTitle',
                  modalMessage: 'passwordRequired', modalIcon: 'ExclamationTriangle',
                  waitToClose: false,
                  modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
              });
          return false;
        } 
        let userData = {};
        userData.to_email = this.state.email;
        userData.password = this.state.password;
        let res = await axios.post('/api/auth/autor_start', {mydata : userData},
                           {headers: {"Content-Type": "application/json"}}); 
        if(res.data === 'no_user'){
         this.setState(
           {showModal:true, modalTitle: 'failed',
               modalMessage: 'noUser', modalIcon: 'ExclamationTriangle',
               waitToClose: false,
               modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
         });
         return (false);  
        }    
        if (res.data === 'bad_password'){
          this.setState(
            {showModal:true, modalTitle: 'failed',
                modalMessage: 'badPassword', modalIcon: 'ExclamationTriangle',
                waitToClose: false,
                modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
          });
          return (false);  
         }                     
        this.setState({showModal: true, modalTitle: "attention", modalMessage: 'sendcode',
           modalIcon: 'InfoCircle', 
           modalButtonMessage: 'ok',
           modalButtonVariant: "#588157", waitToClose: false
        });                   
      }catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorAuthorization',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'ok',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    }

    async startRegistration(){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          });
        if(!this.state.email) {
          this.setState(
              {showModal:true, modalTitle: 'requiredFieldsTitle',
                  modalMessage: 'emailRequired', modalIcon: 'ExclamationTriangle',
                  waitToClose: false,
                  modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
              });
          return false;
        }
        if(!this.state.password) {
          this.setState(
              {showModal:true, modalTitle: 'requiredFieldsTitle',
                  modalMessage: 'passwordRequired', modalIcon: 'ExclamationTriangle',
                  waitToClose: false,
                  modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
              });
          return false;
        }
        if(!this.state.repeetpass) {
          this.setState(
              {showModal:true, modalTitle: 'requiredFieldsTitle',
                  modalMessage: 'repeetpassRequired', modalIcon: 'ExclamationTriangle',
                  waitToClose: false,
                  modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
              });
          return false;
        }
        if(this.state.password !== this.state.repeetpass) {
          this.setState(
            {showModal:true, modalTitle: 'requiredFieldsTitle',
                modalMessage: 'passwordsNoMatch', modalIcon: 'ExclamationTriangle',
                waitToClose: false,
                modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
            });
          return false;
        }
        let userData = {};
        userData.to_email = this.state.email;
        userData.password = this.state.password;
        
        let res = await axios.post('/api/auth/registr_start', {mydata : userData},
                           {headers: {"Content-Type": "application/json"}}); 
        if (res.data === 'old_user'){
          this.setState(
            {showModal:true, modalTitle: 'failed',
                modalMessage: 'oldemail', modalIcon: 'ExclamationTriangle',
                waitToClose: false,
                modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
            });
          return (false);  
        }                   
        this.setState({showModal: true, modalTitle: "attention", modalMessage: 'sendcode',
          modalIcon: 'InfoCircle', 
          modalButtonMessage: 'ok',
          modalButtonVariant: "#588157", waitToClose: false
        });
      } catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorRegistration',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'ok',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    }

    async checkCode(){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          });
        let userData = {};
        userData.to_email = this.state.email;
        userData.code = this.state.confcode;
        let res = await axios.post('/api/auth/check_code', {mydata : userData},
                          {headers: {"Content-Type": "application/json"}}); 
        if (res.data === false){
          this.setState(
            {showModal:true, modalTitle: 'requiredFieldsTitle',
                modalMessage: 'badcode', modalIcon: 'ExclamationTriangle',
                waitToClose: false, 
                modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
            });
        return false;
        }
        else return true;
      } catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorAuthorization',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'returnHome',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    }

    async resendCode(){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          }); 
        let userData = {};
        userData.to_email = this.state.email;
        userData.password = this.password;
        let res;
        if(this.state.key === "registr")
        res = await axios.post('/api/auth/registr_start', {mydata : userData},
                 {headers: {"Content-Type": "application/json"}}); 
        else if(this.state.key === "connect")
        res = await axios.post('/api/auth/autor_start', {mydata : userData},
                           {headers: {"Content-Type": "application/json"}}); 
        if (res.data === 'no_user'){
         this.setState(
           {showModal:true, modalTitle: 'failed',
               modalMessage: 'noUser', modalIcon: 'ExclamationTriangle',
               waitToClose: false,
               modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
         });
         return (false);  
        }    
        if (res.data === 'bad_password'){
          this.setState(
            {showModal:true, modalTitle: 'failed',
                modalMessage: 'badPassword', modalIcon: 'ExclamationTriangle',
                waitToClose: false,
                modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
          });
          return (false);  
         }        
        this.setState({showModal: true, modalTitle: "attention", modalMessage: 'sendcode',
          modalIcon: 'InfoCircle', 
          modalButtonMessage: 'ok',
          modalButtonVariant: "#588157", waitToClose: false
        });
      } catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorRegistration',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'ok',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    }

    async endAuthorization(event){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          });
        let userData = {};
        userData.to_email = this.state.email;
        userData.code = this.state.confcode;
        userData.password = this.state.password;
        let res = await axios.post('/api/auth/check_code', {mydata : userData},
                          {headers: {"Content-Type": "application/json"}}); 
        if (res.data === false){
          this.setState(
            {showModal:true, modalTitle: 'requiredFieldsTitle',
                modalMessage: 'badcode', modalIcon: 'ExclamationTriangle',
                waitToClose: false, 
                modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
            });
        return false;
        }
        else{
          res = await axios.post('/api/auth/autor_end', {mydata : userData},
                          {headers: {"Content-Type": "application/json"}});
          if (res.data.success === true) {
            this.setState({showModal: true, goHome: true,
              modalTitle: 'success',
              modalMessage: 'authorizationComplete',
              modalIcon: 'CheckCircle',
              showModalCode: false,
              modalButtonMessage: 'returnHome',
              modalButtonVariant: "#588157", waitToClose: false
            }); 
          }else{
            this.setState({showModal: true, goHome: true,
              modalTitle: 'failed',
              modalMessage: 'errorAuthorization',
              modalIcon: 'CheckCircle',
              modalButtonMessage: 'returnHome',
              modalButtonVariant: "#E63C36", waitToClose: false
            });
          } 
        }   
      } catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorAuthorization',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'returnHome',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    } 

    async endChangePassword(){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          });
          if(!this.state.password) {
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'passwordRequired', modalIcon: 'ExclamationTriangle',
                    waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
          }
          if(!this.state.repeetpass) {
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'repeetpassRequired', modalIcon: 'ExclamationTriangle',
                    waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
          }
          if(this.state.password !== this.state.repeetpass) {
            this.setState(
              {showModal:true, modalTitle: 'requiredFieldsTitle',
                  modalMessage: 'passwordsNoMatch', modalIcon: 'ExclamationTriangle',
                  waitToClose: false,
                  modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
              });
            return false;
          }  
        let userData = {};
        userData.to_email = this.state.email;
        userData.code = this.state.confcode;
        userData.password = this.state.password;
        let res = await axios.post('/api/auth/new_pass', {mydata : userData},
                          {headers: {"Content-Type": "application/json"}});
        if (res.data === 'success') {
            this.setState({showModal: true, goHome: true,
              modalTitle: 'success',
              modalMessage: 'changePassComplete',
              modalIcon: 'CheckCircle',
              showModalCode: false,
              modalButtonMessage: 'returnHome',
              modalButtonVariant: "#588157", waitToClose: false
            });
             
        }else{
            this.setState({showModal: true, goHome: true,
              modalTitle: 'failed',
              modalMessage: 'errorChangePassword',
              modalIcon: 'CheckCircle',
              modalButtonMessage: 'returnHome',
              modalButtonVariant: "#E63C36", waitToClose: false
            });
        }                
            
      } catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorChangePassword',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'returnHome',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    }

    async endRegistration(event){
      try{
        this.setState(
          {showModal:true, modalTitle: 'processingWait',
          modalMessage: 'waitingForOperation', modalIcon: 'HourglassSplit',
          modalButtonVariant: "gold", waitToClose: true
          });
        let userData = {};
        userData.to_email = this.state.email;
        userData.code = this.state.confcode;
        userData.password = this.state.password;
        let res = await axios.post('/api/auth/check_code', {mydata : userData},
                          {headers: {"Content-Type": "application/json"}});  
        if (res.data === false){
          this.setState(
            {showModal:true, modalTitle: 'requiredFieldsTitle',
                modalMessage: 'badcode', modalIcon: 'ExclamationTriangle',
                waitToClose: false, 
                modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
            });
        return false;
        }
        else{
          res = await axios.post('/api/auth/registr_end', {mydata : userData},
                          {headers: {"Content-Type": "application/json"}});
          if (res.data === 'success') {
            this.setState({showModal: true, goHome: true,
              modalTitle: 'success',
              modalMessage: 'registrationComplete',
              modalIcon: 'CheckCircle',
              showModalCode: false,
              modalButtonMessage: 'returnHome',
              modalButtonVariant: "#588157", waitToClose: false
            });
             
          }else{
            this.setState({showModal: true, goHome: true,
              modalTitle: 'failed',
              modalMessage: 'errorRegistration',
              modalIcon: 'CheckCircle',
              modalButtonMessage: 'returnHome',
              modalButtonVariant: "#E63C36", waitToClose: false
            });
          }                
        }   
      } catch(error)  {
        this.setState({showModal: true, goHome: true,
          modalTitle: 'failed',
          modalMessage: 'errorRegistration',
          modalIcon: 'CheckCircle',
          modalButtonMessage: 'returnHome',
          modalButtonVariant: "#E63C36", waitToClose: false
        });
      }
    } 

    handleChange = (e) => {
      const name = e.target.name
      const value = e.target.value;
      const checked = e.target.checked;
      if (name === 'fiatPayments')
      this.setState({fiatPayments: checked});
      else
      this.setState({ [name] : value, updateMeta : true });
  }

    render(){
        return(
           <div>
            <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
                    <Modal.Body><p className='modalIcon'>
                        {this.state.modalIcon === 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.modalIcon=== 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.modalIcon=== 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.modalIcon === 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        {this.state.modalIcon === 'InfoCircle' && <InfoCircle style={{color: '#588157'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'><Trans i18nKey={this.state.modalMessage}/></p>
                        {!this.state.waitToClose &&
                        <Button className='modalButtonError'
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ async() => {this.setState({showModal:false, modalButtonVariant: '#588157'});
                               if(this.state.modalButtonMessage === 'returnHome') await this.props.history.push('/');
                               else if(this.state.modalTitle === 'attention') 
                                  this.setState({showModalCode: true, showModalRegistr: false, showModalConnect: false});
                            }}> 
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>
             </Modal>
             <Modal show={this.state.showModalRegistr} size='lg' onHide={()=>{}} className='myModal'>
             <Modal.Body>
                {(!this.state.changePass)&&<Modal.Title className='modalTitle' ><Trans i18nKey={'registration'}/></Modal.Title>}
                {(this.state.changePass)&&<Modal.Title className='modalTitle' ><Trans i18nKey={'changePass'}/></Modal.Title>}
               <Form> 
                <Form.Group>
                {(!this.state.changePass)&&<Row>
                 <p className='redAsterisk'><Trans i18nKey={'email'}/></p> 
                </Row>}
                {(!this.state.changePass)&&<Row>
                <Form.Control required type="email" className="createFormPlaceHolder"
                                          name='email' value={this.state.email} onChange={this.handleChange}/>
                </Row>}
                <Row>
                 <p className='redAsterisk'><Trans i18nKey={'password'}/></p> 
                </Row>
                <Row>
                <Form.Control required type="password" className="createFormPlaceHolder"
                                          name='password' value={this.state.password} onChange={this.handleChange}/>
                </Row>
                <Row>
                 <p className='redAsterisk'><Trans i18nKey={'repeetpass'}/></p> 
                </Row>
                <Row>
                <Form.Control required type="password" className="createFormPlaceHolder"
                                          name='repeetpass' value={this.state.repeetpass} onChange={this.handleChange}/>
                </Row>
                </Form.Group>
                </Form> 
               <Row md = {2}>
                <Col>
                <Button className='myModalButton' style={{backgroundColor : "#588157", borderColor : "#588157"}}
                      onClick={ async() => {
                        if (this.state.changePass) await this.endChangePassword();
                        else await this.startRegistration();
                       }}>
                  {(!this.state.changePass)&&<Trans i18nKey= 'registerBtn' />}
                  {(this.state.changePass)&&<Trans i18nKey= 'changePass' />}
                 </Button>
                </Col>
                <Col>
                <Button className='myModalButton'
                  style={{backgroundColor : "#588157", borderColor : "#588157"}}
                  onClick={ async() => {
                 await this.props.history.push('/');
                }}>
                  <Trans i18nKey= 'closeBtn' />
                 </Button>
                </Col>
                </Row>
                </Modal.Body>   
            </Modal>
            
            <Modal show={this.state.showModalCode} size='lg' onHide={()=>{}} className='myModal' centered>
            <Modal.Body>
                <p className='modalTitle'><Trans i18nKey={'confcode'}/></p>   
              <Form> 
                <Form.Group>
                <Row>
                 <p className='redAsterisk'><Trans i18nKey={'entercode'}/></p> 
                </Row>
                <Row>
                <Form.Control type="email" className="createFormPlaceHolder"
                                          name='confcode' value={this.state.confcode} onChange={this.handleChange}/>
                </Row>
                </Form.Group>
                </Form> 
               <Row>
                <Col>
                <Button className='myModalButton'
                 style={{backgroundColor : "#588157", borderColor : "#588157"}}
                       onClick={ async() => {
                        if (this.state.changePass){
                          let res = await this.checkCode();
                          if (res) {
                            this.setState({showModalCode:false, showModal:false, showModalRegistr:true});
                          }
                        } 
                        else if(this.state.key === "registr") await this.endRegistration();
                        else if(this.state.key === "connect") await this.endAuthorization();
                       }}>
                  <Trans i18nKey= 'ok' />
                 </Button>
                 </Col>
                 <Col>
                 <Button className='myModalButton'
                 style={{backgroundColor : "#588157", borderColor : "#588157"}}
                       onClick={ async() => {await this.props.history.push('/');}}>
                  <Trans i18nKey= 'closeBtn' />
                 </Button>
                 </Col>
                 <Col>
                 <Button className='myModalButton'
                 style={{backgroundColor : "#588157", borderColor : "#588157", width: '200px'}}
                       onClick={ async() =>{await this.resendCode();}}>
                  <Trans i18nKey= 'resendcode' />
                 </Button>
                 </Col> 
                </Row>
                </Modal.Body>
            </Modal> 

            <Modal show={this.state.showModalConnect} size='lg' onHide={()=>{}} className='myModal'>
            <Modal.Body> 
              <p className='modalTitle'><Trans i18nKey={this.state.modalTitle} /></p>
             <Form> 
                <Form.Group>
                <Row>
                 <p className='redAsterisk'><Trans i18nKey={'email'}/></p> 
                </Row>
                <Row>
                <Form.Control required type="email" className="createFormPlaceHolder"
                                          name='email' value={this.state.email} onChange={this.handleChange}/>
                </Row>
                <Row>
                <Col>  
                 <p className='redAsterisk'><Trans i18nKey={'password'}/></p> 
                 </Col> 
                 <Col>  
                 <p className='linkbtn' onClick = { async() => {await this.startChangePassword();}}><Trans i18nKey={'forgotPass'}/></p> 
                 </Col>  
                 </Row> 
                <Row>
                <Form.Control required type="password" className="createFormPlaceHolder"
                                          name='password' value={this.state.password} onChange={this.handleChange}/>
                </Row>
                </Form.Group>
                </Form> 
               <Row>
                <Col>
                <Button className='myModalButton'
                    style={{backgroundColor : "#588157", borderColor : "#588157"}}
                      onClick={ async() => {
                        await this.startAuthorization();
                       }}>
                  <Trans i18nKey= 'authorizedBtn' />
                 </Button>
                </Col>
                <Col>
                <Button className='myModalButton'
                   style={{backgroundColor : "#588157", borderColor : "#588157"}}
                   onClick={ () => {
                    this.setState({showModalRegistr: true, modalTitle: "registration", key: "registr", showModalConnect:false})}}>
                  <Trans i18nKey= 'registerBtn' />
                 </Button>
                </Col>
                <Col>
                <Button className='myModalButton'
                  style={{backgroundColor : "#588157", borderColor : "#588157"}}
                  onClick={ async() => {
                   await this.props.history.push('/');}}>
                  <Trans i18nKey= 'closeBtn' />
                 </Button>
                </Col>
                </Row>
                </Modal.Body>   
            </Modal>  
            <Modal show={this.state.showModalDisconnect} onHide={()=>{}} className='myModal'>
            <Modal.Body> 
             <Modal.Title className='modalTitle'><Trans i18nKey={'deauthorization'}/></Modal.Title>
            <Row md = {2}>
                <Col>
                <Button className='myModalButton'
                      style={{backgroundColor : "#588157", borderColor : "#588157"}}
                      onClick={ async() => {
                       await this.deAutorisation();
                       }}>
                  <Trans i18nKey= 'deauthorizedBtn' />
                 </Button>
                </Col>
                <Col>
                <Button className='myModalButton'
                  style={{backgroundColor : "#588157", borderColor : "#588157"}}
                  onClick={ async() => {
                   await this.props.history.push('/');}} >
                  <Trans i18nKey= 'closeBtn' />
                 </Button>
                </Col>
                </Row>
                </Modal.Body>   
            </Modal>  
           </div>  
        )
    };

    async componentDidMount(){

      let toks = this.props.location.pathname.split("/");
      let key = toks[toks.length -1];
      if(key === "registr") this.setState({showModalRegistr: true, modalTitle: "registration", key: key});
      else if(key === "connect") this.setState({showModalConnect: true, modalTitle: "authorization", key: key });
      else if(key === "disconnect") this.setState({showModalDisconnect: true, modalTitle: "deauthorization", key: key});
    };
}

export default Registration 
import React, {Component} from 'react';
import {Container, Form, Button, Modal} from 'react-bootstrap';
import '../css/ccdata.css';
import i18n from '../util/i18n';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import countries from '../countries';
import states from '../states';

const COUNTRIES_FOR_3DS = [
'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]

class CCData extends Component {

    constructor(props) {
        super(props);
        this.state = {
            ccinfo : {
                city: '',
                country: '',
                district: '',
                line1: '',
                line2: '',
                postalCode: '',
                cvc: '',
                expMonth: '',
                expYear: '',
                email: '',
                phoneNumber: '',
                currency: 'USD',
                name: '',
                number: '',
                verification: 'cvv'
            },
            focus: '',
            knownStates: false,
            errorMessage: '',
            threeDs: false,
        }
        if(Object.keys(this.props.currentCCInfo)) {
            Object.keys(this.props.currentCCInfo).forEach((key) => {
                this.state.ccinfo[key] = this.props.currentCCInfo[key];
            })
            if(this.props.currentCCInfo.ccError) {
                this.state.errorMessage = this.props.currentCCInfo.ccError;
            }
        }
    }

    componentDidMount() {
        if(this.props.currentCCInfo.ccError) {
            console.log(this.props.currentCCInfo.ccError);
            if(this.props.currentCCInfo.ccError === 'cardPaymentFailed_card_invalid') {
                this.numberInput.focus();
            } else if(this.props.currentCCInfo.ccError === 'cardPaymentDeclined') {
                this.ccvInput.focus();
            } else if(this.props.currentCCInfo.ccError === 'Invalid District/State') {
                this.districtInput.focus();
            } else if(this.props.currentCCInfo.ccErrorType === 'default') {
                //no specific focus, unknown error
            } else {
                if(this.props.currentCCInfo.ccErrorType) {
                    this[this.props.currentCCInfo.ccErrorType].focus();
                }
            }
        }
    }

    handleInputChange = (e) => {
        var { name, value } = e.target;
        if(value) {
            switch(name) {
                case 'number':
                    if(e.nativeEvent.inputType === 'insertFromPaste') {
                        value = value.replace(/\s+/g, '');
                        value = [value.slice(0,4), ' ', value.slice(4,8), ' ', value.slice(8,12), ' ', value.slice(12)].join('');
                    } else if(e.nativeEvent.inputType === 'deleteContentBackward') {
                        break;
                    } else {
                        if((/[0-9]/).test(value.charAt(value.length-1))) {
                            if(value.length === 4 || value.length === 9 || value.length === 14) {
                                value = value + ' ';
                            } else if (value.length === 20) {
                                return;
                            }
                        } else {
                            return;
                        }
                    }
                    break;
                case 'expMonth':
                    if(!(/[0-9]/).test(value.charAt(value.length-1)) || value.length > 2) {
                        return
                    }
                    break;
                case 'expYear':
                    if(!(/[0-9]/).test(value.charAt(value.length-1)) ||  value.length > 4) {
                        return;
                    }
                    break;
                case 'cvc':
                    if(!(/[0-9]/).test(value.charAt(value.length-1)) || value.length > 3) {
                        return;
                    }
                    break;
                case 'country':
                    if(value === 'US' || value === 'MS' || value === 'CA' || value === 'AU') {
                        this.setState({knownStates: true})
                    } else {
                        this.setState({knownStates: false})
                    }
                    //reset state if country is changed
                    this.setState(prevState => ({
                        ccinfo: {
                            ...prevState.ccinfo,
                            district : ''
                        }
                    }));
                    if(this.state.errorMessage) {
                        this.setState({errorMessage:''});
                    }
                    //choose verification process
                    if(COUNTRIES_FOR_3DS.includes(value)) {
                        this.setState({ threeDs: true });
                    } else {
                        this.setState({ threeDs: false });
                    }
                    break;
                case 'district':
                    if(!this.state.ccinfo.country) {
                        this.setState({error: true, errorMessage: 'countryFirst'});
                        this.countryInput.focus();
                        return;
                    } else {
                        this.setState({errorMessage: ''});
                    }
                    break;
                case 'threeDs':
                    this.setState({threeDs: !this.state.threeDs})
                    break;
                default:
                    break;
            }
        }
        this.setState(prevState => ({
            ccinfo: {
                ...prevState.ccinfo,
                [name] : value
            }
        }));
    }

    handleSubmit = async (e) => {
        e.preventDefault();
        if(this.state.ccinfo.phoneNumber && this.state.ccinfo.country) {
            if(!isValidPhoneNumber(this.state.ccinfo.phoneNumber, this.state.ccinfo.country)) {
                this.setState({errorMessage : 'validPhone'});
                this.phoneNumberInput.focus();
                return;
            } else {
                this.setState({errorMessage: ''});
            }
        }
        let data = this.state.ccinfo;
        data.number = (data.number).replace(/ /g, '');
        const phoneNumberE164 = parsePhoneNumber(data.phoneNumber, data.country);
        phoneNumberE164.format('E.164');
        this.setState({errorMessage: ''});
        data.phoneNumber = phoneNumberE164.number;
        if(this.state.threeDs) {
            data.verification = 'three_d_secure';
        } else {
            data.verification = 'cvv';
        }
        this.props.handleGetCCInfo(data);
        this.props.handleCCInfoCancel();

    }

    handleCancel = () => {
        this.props.handleCCInfoCancel();
    }

    render() {
        return (
            <div>
                <Modal show={true} onHide={()=>{}}>
                    <div id="ccinfoDiv">
                        <Container>
                            <Form onSubmit={this.handleSubmit}>
                                <div className="ccInfoTitles">{i18n.t('cardInfo')}</div>
                                <Form.Control type="text" name="name" placeholder={i18n.t('name')} required className='ccInfoFormPlaceHolder'
                                    pattern="([\S]+([\s]+[\S]+)+)" title={i18n.t('firstNlast')} onChange={this.handleInputChange} value={this.state.ccinfo.name}
                                    ref={(input) => this.nameInput = input} autoComplete='cc-name'
                                />
                                <br/>
                                <Form.Control type="text" name="number" placeholder={i18n.t('cardNumber')} required className='ccInfoFormPlaceHolder'
                                    pattern="([0-9 ]{19})|([0-9]{16})" title={i18n.t('cardNumber16digit')} value={this.state.ccinfo.number}
                                    onChange={this.handleInputChange} ref={(input) => this.numberInput = input} autoComplete='cc-number'
                                />
                                <br/>
                                <div id='experation'>
                                    <Form.Control type="text" name="expMonth" placeholder={i18n.t('expMM')} required className='experationInput'
                                        pattern="(0[1-9]|1[0-2])" title={i18n.t('monthExp')} onChange={this.handleInputChange} value={this.state.ccinfo.expMonth}
                                        ref={(input) => this.expMonthInput = input} autoComplete='cc-exp-month'
                                    />
                                    <Form.Control type="text" name="expYear" placeholder={i18n.t('expYY')} required className='experationInput'
                                        pattern="(20)[2,3]{1}[0-9]{1}" title={i18n.t('yearExp')} onChange={this.handleInputChange} value={this.state.ccinfo.expYear}
                                        ref={(input) => this.expYearInput = input} autoComplete='cc-exp-year'
                                    />
                                    <Form.Control type="text" name="cvc" placeholder={i18n.t('cvc')} required className='cvcInput'
                                    pattern="[0-9]{3}" title={i18n.t('cvc3digit')} value={this.state.ccinfo.cvc} onChange={this.handleInputChange}
                                    ref={(input) => this.cvvInput = input} autoComplete='cc-csc'/>
                                </div>
                                <div className="ccInfoTitles">{i18n.t('billingInfo')}</div>
                                <Form.Control type="text" name="email" placeholder={i18n.t('email')} required className='ccInfoFormPlaceHolder'
                                    pattern="[\S]+[@]{1}[\S]+[.]{1}[\S]+" title={i18n.t('emailFaulty')} onChange={this.handleInputChange} value={this.state.ccinfo.email}
                                    ref={(input) => this.emailInput = input} autoComplete='email'
                                />
                                <Form.Control type="text" name="line1" placeholder={i18n.t('streetAddress1')} required className='ccInfoFormPlaceHolder'
                                    onChange={this.handleInputChange} value={this.state.ccinfo.line1}  ref={(input) => this.line1Input = input}
                                    autoComplete='address-line1'
                                />
                                <Form.Control type="text" name="line2" placeholder={i18n.t('streetAddress2')} className='ccInfoFormPlaceHolder'
                                    onChange={this.handleInputChange} value={this.state.ccinfo.line2}  ref={(input) => this.line2Input = input}
                                    autoComplete='address-line2'
                                />
                                <Form.Control type="text" name="city" placeholder={i18n.t('city')} required className='ccInfoFormPlaceHolder'
                                    onChange={this.handleInputChange} value={this.state.ccinfo.city}  ref={(input) => this.cityInput = input}
                                />
                                <Form.Control as="select" name='country' required className='countryZip' value='' onChange={this.handleInputChange}
                                 ref={(input) => this.countryInput = input} autoComplete='country' >
                                    <option value={this.state.ccinfo.country ? this.state.ccinfo.country : ''}>{this.state.ccinfo.country ? this.state.ccinfo.country : i18n.t('country')}</option>
                                    {countries.map((data) => <option value={data.value}>{data.text}</option>)}
                                </Form.Control>
                                <Form.Control type="text" name="postalCode" placeholder={i18n.t('postalCode')} required className='countryZip' autoComplete='postal-code'
                                    value={this.state.ccinfo.postalCode} onChange={this.handleInputChange}  ref={(input) => this.postalCodeInput = input}
                                />
                                {this.state.knownStates && <Form.Control as="select" name="district" required className='ccInfoFormPlaceHolder' onChange={this.handleInputChange}
                                    ref={(input)=> this.districtInput = input}>
                                    <option value=''>{i18n.t('state')}</option>
                                    {states[this.state.ccinfo.country].map((data) => <option value={data.value}>{data.text}</option>)}
                                </Form.Control>}
                                {!this.state.knownStates && <Form.Control type="text" name="district" placeholder={i18n.t('state')} required className='ccInfoFormPlaceHolder'
                                    onChange={this.handleInputChange} value={this.state.ccinfo.district} ref={(input)=> this.districtInput = input}
                                />}
                                <Form.Control type="text" name="phoneNumber" placeholder={i18n.t('phoneNumber')} required className='ccInfoFormPlaceHolder'
                                    onChange={this.handleInputChange} value={this.state.ccinfo.phoneNumber}  autoComplete='tel'
                                    ref={(input) => this.phoneNumberInput = input}
                                />
                                <br/>
                                {this.state.ccinfo.fiatPaymentProvider === 'circle' &&
                                <label><input type="checkbox" checked={this.state.threeDs} value={this.state.threeDs} name="threeDs" onChange={this.handleInputChange} />  {i18n.t('3dsV')}</label>}
                                <br/>
                                <span className='warning'>{i18n.t(`${this.state.errorMessage}`)}</span>
                                <br/>
                                <br/>
                                <Button id="CCdonateBtn" type="Submit">{i18n.t('donate')}</Button>
                                <Button id="CCcancelBtn" onClick={()=>this.handleCancel()}>{i18n.t('cancel')}</Button>
                                <br/>
                                <br/>
                            </Form>
                        </Container>
                    </div>
                </Modal>
            </div>
        );
    }
}

export default CCData;

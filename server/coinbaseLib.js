const Coinbase = require('coinbase-commerce-node');
const CoinbaseClient = Coinbase.Client;
const crypto = require('crypto');

class CoinbaseLib {
    constructor() {
    }

    async createCharge(req, res, CLIENT, DBNAME, Sentry, apiKey) {
        let campaignId = req.body.campaignId;
        let campaignName = req.body.campaignName;
        let amount = req.body.amount;
        let url = req.headers.referer;
        let tipAmount = req.body.tipAmount;
        let donationAmount = req.body.donationAmount;
        if (url.includes('?')) url = url.split('?')[0];
        try {
            // Log attempt to create a charge
            Sentry.addBreadcrumb({
                category: "CoinbaseCommerce",
                message: `Creating Coinbase charge for ${campaignId}. Amount: ${amount}`,
                level: "info",
            });
            console.log("Creating Coinbase charge")

            // Attempt to create a charge
            const client = CoinbaseClient.init(apiKey);
            client.setRequestTimeout(3000);
            var Charge = Coinbase.resources.Charge;
            const chargeData = {
                name: campaignName,
                description: "Donation to " + campaignName + " campaign",
                local_price: {
                    amount: amount,
                    currency: 'USD',
                },
                metadata: {
                    customer_id: campaignId,
                    customer_name: campaignName,
                    tip_amount: tipAmount,
                    donation_amount: donationAmount,
                },
                pricing_type: 'fixed_price',
                redirect_url: `${url}?fp=s&am=${req.body.amount}`,
                cancel_url: url,
            };

            const charge = await Charge.create(chargeData);
            const chargeId = charge.id;
            const checkoutUrl = charge.hosted_url;

            // Log charge ID and redirect URL
            console.log('Charge created. Charge ID:', chargeId);
            Sentry.addBreadcrumb({
                category: "CoinbaseCommerce",
                message: `Created Coinbase charge ID ${chargeId} for ${campaignId}. Amount: ${amount}`,
                level: "info",
            });
            let date_val = new Date();
            // Insert charge into DB
            const data = {
                status: "created",
                amount: amount,
                tip_amount: tipAmount,
                donation_amount: donationAmount,
                charge_id: chargeId,
                campaign_id: campaignId,
                checkout_url: checkoutUrl,
                updated_at: date_val,
                created_on: date_val,
                currency: "USD"
            }
            const DB = CLIENT.db(DBNAME);
            const chargesCollection = await DB.collection('coinbase_commerce_charges');
            await chargesCollection.insertOne(data);

            // Redirect to checkout page
            res.status(200).send({paymentStatus: 'action_required', redirectUrl: checkoutUrl});
            return;
        } catch (error) {
            console.error('Error creating charge:', error.message);
            Sentry.captureException(new Error(error));
        }
        res.sendStatus(500);
    }

    /**
     * Update charge status in DB
     * @param {*} CLIENT
     * @param {*} DBNAME
     * @param {*} Sentry
     * @param {*} payload
     */
    async updateCharge(DB, Sentry, payload) {
        Sentry.addBreadcrumb({
            category: "CoinbaseCommerce::updateCharge",
            message: `payload: ${JSON.stringify(payload)}`,
            level: "info",
        });

        const chargeId = payload.event.data.id;
        const chargesCollection = await DB.collection('coinbase_commerce_charges');
        let chargeRecord = await chargesCollection.findOne({"charge_id" : chargeId});
        if(chargeRecord) {
            let donation_time = new Date();
            chargeRecord.code = payload.event.data.code;
            chargeRecord.status = payload.event.type;
            chargeRecord.payments = payload.event.data.payments;
            chargeRecord.fee = payload.event.data.fee_rate;
            chargeRecord.local_exchange_rates = payload.event.data.local_exchange_rates;
            chargeRecord.updated_at = donation_time;
            await chargesCollection.updateOne({'_id': chargeRecord._id}, {$set: chargeRecord});

            if(chargeRecord.status === 'charge:confirmed') {
                Sentry.addBreadcrumb({
                    category: "CoinbaseCommerce",
                    message: `Charge ID ${chargeId} confirmed`,
                    level: "info",
                });
                // Update raisedOnCoinbase field of campaign and lastDonationTime
                const campaignId = chargeRecord.campaign_id;
                const campaignCollection = await DB.collection('campaigns');
                const campaign = await campaignCollection.findOne({"_id" : campaignId});
                if(campaign) {
                    campaign.raisedOnCoinbase += chargeRecord.amount;
                    campaign.lastDonationTime = donation_time;
                    await campaignCollection.updateOne({'_id': campaignId}, {$set: campaign});
                } else {
                    Sentry.addBreadcrumb({
                        category: "CoinbaseCommerce",
                        message: `Campaign ID ${campaignId} not found`,
                        level: "info",
                    });
                    Sentry.captureException(new Error('Campaign not found'));
                }   
            } else if(chargeRecord.status === 'charge:failed') {
                Sentry.addBreadcrumb({
                    category: "CoinbaseCommerce",
                    message: `Charge ID ${chargeId} failed`,
                    level: "info",
                });
            }
        } else {
            Sentry.addBreadcrumb({
                category: "CoinbaseCommerce",
                message: `Charge ID ${chargeId} not found in DB`,
                level: "info",
            });
            Sentry.captureException(new Error('Received webhook notification for unknown charge ID'));
        }
    }

    /**
     *  Helper function to verify webhook payload using the shared secret
     * */
    verifyWebhookPayload(signature, payload, sharedSecret, Sentry) {
        try {
            Sentry.addBreadcrumb({
                category: "CoinbaseCommerce::verifyWebhookPayload",
                message: `Signature ${signature} Payload: ${JSON.stringify(payload)} Shared Secret: ${sharedSecret}`,
                level: "info",
            });
            const verifier = crypto.createVerify('SHA256');
            verifier.update(JSON.stringify(payload));
            const isVerified = verifier.verify(sharedSecret, signature, 'base64');
            return isVerified;
        } catch (error) {
            Sentry.captureException(new Error(error));
        }
        return true;
    }
}

module.exports = CoinbaseLib;

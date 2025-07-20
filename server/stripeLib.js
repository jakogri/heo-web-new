const { v4: uuidv4 } = require('uuid');
const Sentry = require("@sentry/node");
class StripeLib {
    constructor() {}

    async handleNotification (req, res, STRIPE_API_KEY, STRIPE_WH_SECRET, CLIENT, DBNAME, Sentry) {
        try {
            Sentry.addBreadcrumb({
                category: "stripe",
                message: `Received webhook notification from stripe`,
                level: "info",
            });
            const stripe = require('stripe')(STRIPE_API_KEY);
            console.log(`Notifications: initiated stripe API`)
            console.log(`Stripe WH secret ${STRIPE_WH_SECRET}`)
            let event = req.body;
            Sentry.addBreadcrumb({
                category: "stripe",
                message: event,
                level: "debug",
            });
            if(STRIPE_WH_SECRET) {
                // Get the signature sent by Stripe
                const signature = req.headers['stripe-signature'];
                try {
                    event = stripe.webhooks.constructEvent(
                        req.body,
                        signature,
                        STRIPE_WH_SECRET
                    );
                } catch (err) {
                    console.log(`Webhook signature verification failed.`, err.message);
                    Sentry.captureException(new Error(err));
                    return res.sendStatus(400);
                }
            }
            // Handle the event
            switch (event.type) {
                case 'payment_intent.succeeded':
                    Sentry.addBreadcrumb({
                        category: "stripe",
                        message: `Payment intent succeeded`,
                        level: "debug",
                    });
                    const paymentIntent = event.data.object;
                    Sentry.addBreadcrumb({
                        category: "stripe",
                        message: `Payment intent for ${paymentIntent.amount}`,
                        level: "debug",
                    });
                    if(paymentIntent.metadata && paymentIntent.metadata.campaign_id) {
                        //this is a payment for a campaign
                        if(paymentIntent.status && paymentIntent.status == "succeeded") {
                            //try finding an existing record
                            const data = {
                                paymentStatus: "paid",
                                lastUpdated: new Date(),
                                currency: paymentIntent.currency,
                                totalAmount: paymentIntent.amount/100,
                                referenceId: paymentIntent.id,
                                campaignId: paymentIntent.metadata.campaign_id,
                                tipAmount: paymentIntent.metadata.tip_amount,
                                paymentAmount: paymentIntent.metadata.donation_amount,
                                provider: 'stripe'
                            }
                            try {
                                const DB = CLIENT.db(DBNAME);
                                const paymentRecordsCollection = await DB.collection('fiat_payment_records');
                                let paymentRecord = await paymentRecordsCollection.findOne({"referenceId" : paymentIntent.id});
                                if(!paymentRecord) {
                                    await paymentRecordsCollection.insertOne(data);
                                    Sentry.addBreadcrumb({
                                        category: "stripe",
                                        message: `inserted record into fiat_payment_records. Record data: ${data}`,
                                        level: "debug",
                                    });
                                } else {
                                    await paymentRecordsCollection.updateOne({'_id': paymentRecord._id}, {$set: data});
                                }
                                //get all payment records for this campaign
                                let paidPayments = await (await paymentRecordsCollection.aggregate([
                                    {$match:{campaignId: paymentIntent.metadata.campaign_id, paymentStatus:'paid'}},
                                    {$group:{_id:"$campaignId", total: { $sum: "$paymentAmount" }}}
                                ])).next();

                                Sentry.addBreadcrumb({
                                    category: "stripe",
                                    message: `Aggregated total paid payments: ${paidPayments}`,
                                    level: "debug",
                                });
                                if(paidPayments && paidPayments.total) {
                                    //get the fees
                                    //update fiatDonations field of the campaign
                                    const campaignsCollection = await DB.collection('campaigns');
                                    let campaignRecord = await campaignsCollection.findOne({"_id" : paymentIntent.metadata.campaign_id});
                                    if(campaignRecord) {
                                        await campaignsCollection.updateOne({"_id" : paymentIntent.metadata.campaign_id},
                                            {$set: {fiatDonations:paidPayments.total,
                                                    lastDonationTime : new Date(Date.now())
                                            }});
                                        //console.log(`Updated total fiatPayments for campaign ${paymentIntent.metadata.campaign_id} to ${paidPayments.total}`);
                                        Sentry.addBreadcrumb({
                                            category: "stripe",
                                            message: `Updated total fiatPayments for campaign ${paymentIntent.metadata.campaign_id} to ${paidPayments.total}`,
                                            level: "debug",
                                        });
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                                Sentry.captureException(new Error(err));
                            }
                        } else {
                            Sentry.addBreadcrumb({
                                category: "stripe",
                                message: `Payment status is ${paymentIntent.status} `,
                                level: "debug",
                            });
                        }
                    } else {
                        Sentry.captureException(new Error(`Could not find campaign Id in metadata`));
                        //fetch payment object from Stripe API
                        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id);
                        // get items from payment object
                        const items = paymentIntent.charges.data[0].invoice.lines.data;
                    }
                case 'invoice.payment_succeeded':
                    Sentry.addBreadcrumb({
                        category: "stripe",
                        message: `Invoice payment succeeded`,
                        level: "debug",
                    });
                    const invoice = event.data.object;
                    Sentry.addBreadcrumb({
                        category: "stripe",
                        message: `Invoice for ${invoice.amount_paid}`,
                        level: "debug",
                    });
                    if(invoice.subscription_details && invoice.subscription_details.metadata && invoice.subscription_details.metadata.campaign_id) {
                        //this is a payment for a campaign
                        if(invoice.status && invoice.status == "paid") {
                            //try finding an existing record
                            const data = {
                                paymentStatus: "paid",
                                lastUpdated: new Date(),
                                currency: invoice.currency,
                                totalAmount: invoice.amount_paid/100,
                                tipAmount: invoice.subscription_details.metadata.tip_amount,
                                paymentAmount: invoice.subscription_details.metadata.donation_amount,
                                referenceId: invoice.id,
                                campaignId: invoice.metadata.campaign_id,
                                provider: 'stripe'
                            }
                            try {
                                const DB = CLIENT.db(DBNAME);
                                const paymentRecordsCollection = await DB.collection('fiat_payment_records');
                                let paymentRecord = await paymentRecordsCollection.findOne({"referenceId" : invoice.id});
                                if(!paymentRecord) {
                                    await paymentRecordsCollection.insertOne(data);
                                    Sentry.addBreadcrumb({
                                        category: "stripe",
                                        message: `inserted record into fiat_payment_records. Record data: ${data}`,
                                        level: "debug",
                                    });
                                } else {
                                    await paymentRecordsCollection.updateOne({'_id': paymentRecord._id}, {$set: data});
                                }
                                //get all payment records for this campaign
                                let paidPayments = await (await paymentRecordsCollection.aggregate([
                                    {$match:{campaignId: invoice.metadata.campaign_id, paymentStatus:'paid'}},
                                    {$group:{_id:"$campaignId", total: { $sum: "$paymentAmount" }}}
                                ])).next();

                                Sentry.addBreadcrumb({
                                    category: "stripe",
                                    message: `Aggregated total paid payments: ${paidPayments}`,
                                    level: "debug",
                                });
                                if(paidPayments && paidPayments.total) {
                                    //get the fees
                                    //update fiatDonations field of the campaign
                                    const campaignsCollection = await DB.collection('campaigns');
                                    let campaignRecord = await campaignsCollection.findOne({"_id" : invoice.metadata.campaign_id});
                                    if(campaignRecord) {
                                        await campaignsCollection.updateOne({"_id" : invoice.metadata.campaign_id},
                                            {$set: {fiatDonations:paidPayments.total,
                                                    lastDonationTime : new Date(Date.now())
                                            }});
                                        //console.log(`Updated total fiatPayments for campaign ${invoice.metadata.campaign_id} to ${paidPayments.total}`);
                                        Sentry.addBreadcrumb({
                                            category: "stripe",
                                            message: `Updated total fiatPayments for campaign ${invoice.metadata.campaign_id} to ${paidPayments.total}`,
                                            level: "debug",
                                        });
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                                Sentry.captureException(new Error(err));
                            }
                        } else {
                            Sentry.addBreadcrumb({
                                category: "stripe",
                                message: `Payment status is ${invoice.status} `,
                                level: "debug",
                            });
                        }
                    } else {
                        Sentry.captureException(new Error(`Could not find campaign Id in metadata`));
                    }
                    break;

                default:
                    // Unexpected event type
                    console.log(`Unhandled event type ${event.type}.`);
                    Sentry.captureException(new Error(`Unhandled event type ${event.type}.`));
            }
        } catch (err) {
            console.log(err);
            if(err.response) {
                Sentry.setContext("response", err.response);
                if(err.response.data) {
                    Sentry.addBreadcrumb({
                        category: "responsedata",
                        message: JSON.stringify(err.response.data),
                        level: "info",
                    });
                }
            }
            Sentry.captureException(new Error(err));
        }
    }
    async handleDonateFiat(req, res, STRIPE_API_KEY, CLIENT, DBNAME, Sentry) {
        const stripe = require('stripe')(STRIPE_API_KEY);
        console.log(`Initiated stripe API`)
        let reffId = uuidv4();
        let url = req.headers.referer;
        if (url.includes('?')) url = url.split('?')[0];
        try {
            Sentry.addBreadcrumb({
                category: "stripe",
                message: `Creating checkout session ${reffId} for ${req.body.campaignId}. Currency: ${req.body.currency}. Amount: ${req.body.amount}`,
                level: "info",
            });
            if(!req.body.campaignId || !req.body.currency || !req.body.amount || !req.body.campaignName) {
                Sentry.captureException(new Error(`Missing parameters`));
                return res.status(400).send('Missing parameters');
            }
            console.log("Creating Stripe checkout session")
            const DB = CLIENT.db(DBNAME);
            const campaignsCollection = await DB.collection('campaigns');
            let campaignRecord = await campaignsCollection.findOne({"_id" : req.body.campaignId});
            if(!campaignRecord) {
                Sentry.captureException(new Error(`Campaign not found in DB`));
                return res.status(400).send('Campaign not found');
            }
            let productID = campaignRecord.stripeProductId;
            if(!productID) {
                Sentry.captureException(new Error(`Stripe product ID not found in DB`));
                return res.status(400).send('Stripe product ID not found');
            }
            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: req.body.currency,
                            product: productID,
                            unit_amount: req.body.amount*100,
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    campaign_id: req.body.campaignId,
                    tip_amount: req.body.tipAmount,
                    donation_amount: req.body.donationAmount
                },
                payment_intent_data: {
                    description: req.body.campaignName,
                    statement_descriptor: "blago.click donation",
                    metadata: {
                        campaign_id: req.body.campaignId,
                        tip_amount: req.body.tipAmount,
                        donation_amount: req.body.donationAmount
                    }
                },
                submit_type: "donate",
                mode: 'payment',
                client_reference_id: reffId,
                success_url: `${url}?fp=s&am=${req.body.amount}&ref=${reffId}`,
                cancel_url: `${url}`
            });
            try {
                const data = {
                    paymentStatus: "created",
                    lastUpdated: new Date(),
                    currency: req.body.currency,
                    paymentAmount: req.body.amount,
                    referenceId: session.payment_intent,
                    campaignId: req.body.campaignId,
                    paymentCreationDate: new Date().toISOString(),
                    provider: 'stripe'
                }
                const paymentRecordsCollection = await DB.collection('fiat_payment_records');
                let paymentRecord = await paymentRecordsCollection.findOne({"referenceId" : session.payment_intent});
                if(!paymentRecord) {
                    await paymentRecordsCollection.insertOne(data);
                    Sentry.addBreadcrumb({
                        category: "stripe",
                        message: `inserted record into fiat_payment_records. Record data: ${data}`,
                        level: "debug",
                    });
                } else {
                    Sentry.captureException(
                        new Error(`Record already exists in fiat_payment_records. Record data: ${data}`)
                    );
                }
            } catch (err) {
                console.log(err);
                Sentry.captureException(new Error(err));
            }
            if(session && session.url) {
                res.status(200).send({paymentStatus: 'action_required', redirectUrl: session.url});
                return;
            } else {
                console.log("Failed to create Stripe checkout session")
                Sentry.captureException(new Error(`Failed to create Stripe checkout session for ${req.body.campaignId}`));
            }
        } catch (err) {
            console.log(err);
            if(err.response) {
                Sentry.setContext("response", err.response);
                if(err.response.data) {
                    Sentry.addBreadcrumb({
                        category: "responsedata",
                        message: JSON.stringify(err.response.data),
                        level: "info",
                    });
                }
            }
            Sentry.captureException(new Error(err));
        }
        res.sendStatus(500);
    }

    async handleDonateRecurring(req, res, STRIPE_API_KEY, CLIENT, DBNAME, Sentry) {
        const stripe = require('stripe')(STRIPE_API_KEY);
        console.log(`Initiated stripe API`)
        let reffId = uuidv4();
        let url = req.headers.referer;
        if (url.includes('?')) url = url.split('?')[0];
        try {
            Sentry.addBreadcrumb({
                category: "stripe",
                message: `Creating recurring donations for ${req.body.campaignId}. Currency: ${req.body.currency}. Amount: ${req.body.amount}`,
                level: "info",
            });
            if(!req.body.campaignId || !req.body.currency || !req.body.amount || !req.body.campaignName) {
                Sentry.captureException(new Error(`Missing parameters`));
                return res.status(400).send('Missing parameters');
            }
            console.log("Lookup stripe product ID for this campaign in DB")
            const DB = CLIENT.db(DBNAME);
            const campaignsCollection = await DB.collection('campaigns');
            let campaignRecord = await campaignsCollection.findOne({"_id" : req.body.campaignId});
            if(!campaignRecord) {
                Sentry.captureException(new Error(`Campaign not found in DB`));
                return res.status(400).send('Campaign not found');
            }
            let productID = campaignRecord.stripeProductId;
            if(!productID) {
                Sentry.captureException(new Error(`Stripe product ID not found in DB`));
                return res.status(400).send('Stripe product ID not found');
            }
            console.log("Checking if this product has a recurring plan with this price")
            let priceID = null;
            let prices = await stripe.prices.list({product: productID});
            for(let i=0; i<prices.data.length; i++) {
                if(prices.data[i].unit_amount == req.body.amount*100 && prices.data[i].currency.toLowerCase() == req.body.currency.toLowerCase()) {
                    priceID = prices.data[i].id;
                    Sentry.addBreadcrumb({
                        category: "stripe",
                        message: `Found a price with this amount for this product. Price ID: ${priceID}`,
                        level: "info",
                    });
                    break;
                }
            }
            if(!priceID) {
                Sentry.addBreadcrumb({
                    category: "stripe",
                    message: `Did not find a price with this amount for this product. Creating a new price for this product with amount ${req.body.amount}`,
                    level: "info",
                });
                console.log("Did not find a price with this amount for this product")
                console.log("Creating a new price for this product with amount ", req.body.amount)
                const price = await stripe.prices.create({
                    product: productID,
                    unit_amount: req.body.amount*100,
                    currency: req.body.currency,
                    recurring: {interval: 'month'},
                });
                priceID = price.id;
            }
            console.log("Creating Stripe checkout session")
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceID,
                        quantity: 1,
                    },
                ],
                metadata: {
                    campaign_id: req.body.campaignId
                },
                subscription_data: {
                    metadata: {
                        campaign_id: req.body.campaignId,
                        tip_amount: req.body.tipAmount,
                        donation_amount: req.body.donationAmount
                    }
                },
                client_reference_id: reffId,
                success_url: `${url}?fp=s&am=${req.body.amount}&ref=${reffId}`,
                cancel_url: `${url}`
            });
            if(session && session.url) {
                res.status(200).send({paymentStatus: 'action_required', redirectUrl: session.url});
                return;
            } else {
                console.log("Failed to create Stripe checkout session")
                Sentry.captureException(new Error(`Failed to create Stripe checkout session for ${req.body.campaignId}`));
            }

        } catch (err) {
            console.log(err);
            if(err.response) {
                Sentry.setContext("response", err.response);
                if(err.response.data) {
                    Sentry.addBreadcrumb({
                        category: "responsedata",
                        message: JSON.stringify(err.response.data),
                        level: "info",
                    });
                }
            }
            Sentry.captureException(new Error(err));
        }

    }
}


module.exports = StripeLib;

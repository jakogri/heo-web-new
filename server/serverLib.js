const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');


class ServerLib {
    constructor() {
        this.emailCode = new Map();
    }

    testingClass() {
        console.log('server library class');
    }

    getRandomCoge(sumString) {
        const symbolArr = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
        var randomString = "";
        for (let i=0; i<sumString; i++){
            var index = Math.floor(Math.random()*symbolArr.length);
            randomString +=symbolArr[index];
        }
        return randomString;
    }

    async handleRegistrationStart(req, res, Sentry){
        try{
            let randCode = this.getRandomCoge(12);
            let text = "Confirmation Code - " + randCode;
            this.emailCode.delete(req.body.mydata.to_email);
            this.emailCode.set(req.body.mydata.to_email, randCode);
            return(text);
        } catch (err) {
          console.log(err);  
          Sentry.captureException(new Error(err));
          res.sendStatus(500);
        }
    }

    async handleCheckUser(req, DB){
        try {
            const myCollection = await DB.collection('users');
            let result = await myCollection.findOne({"_id" : req.body.mydata.to_email});
            if ((result)&&(req.body.mydata.password)){
             let res = bcrypt.compareSync(req.body.mydata.password, result.password);
             if (res === true) return (1);
             else if(res === false) return (2);
            }
            else if ((result)&&(!req.body.mydata.password)) return(1);
            else return (0);
        } catch (err) {
            console.log(err);
            return (0);
        }
    }

    async handleRegistrationEnd(req, res, Sentry, DB){
        let password = bcrypt.hashSync(req.body.mydata.password, 8);
        const ITEM = {
            _id: req.body.mydata.to_email,
            password: password
        }
        try {
            const myCollection = await DB.collection('users');
            await myCollection.insertOne(ITEM);
            res.send('success');
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleNewPassword(req, res, Sentry, DB){
        let password = bcrypt.hashSync(req.body.mydata.password, 8);
        try{
            const myCollection = await DB.collection('users');
            await myCollection.updateOne({'_id': req.body.mydata.to_email}, {$set: {password:password}});
            res.send('success');
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleCheckCode(req, res){
        let randCode = this.emailCode.get(req.body.mydata.to_email);
        if (randCode === req.body.mydata.code) res.send(true);
        else res.send(false);
    }

    handleUploadImage(req, res, S3, Sentry) {
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.files.myFile.name,
            Body: req.files.myFile.data
        }
        S3.upload(PARAMS, (error, data) => {
            console.log('real upload called');
            if (error) {
                Sentry.captureException(new Error(error));
                res.sendStatus(500);
            } else {
              res.send(data.Location);
            }
        });
    }

    handleDeleteImage(req, res, S3, Sentry) {
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.body.name,
        }
        S3.deleteObject(PARAMS, (error, data) => {
            if (error) {
                Sentry.captureException(new Error(error));
                res.sendStatus(500);
            } else {
                res.send('complete');
            }
        });
    }

    async handleSendEmail(req, res, Sentry, key, text, DB){
       try{
        const emailCollection = await DB.collection('global_configs');
        let result = await emailCollection.findOne({"_id" : key});
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: result.user,
              pass: result.pass
            }
          });
        let to_email;
        if (key === "HEO-Platform Confirmation Code") to_email = req.body.mydata.to_email;
        else if (key === "New Campaign Alert") to_email = result.to;
        else if (key === "Failed to delete picture") to_email = result.to;
        else if (key === "Donations not preserved in the database") to_email = result.to;
        else to_email = result.to; 
        await transporter.sendMail({
            from: result.from, // sender address
            to: to_email, // list of receivers
            subject: result.subject, // Subject line
            text: text // html body
          }).then(info => {
            console.log({info});
            res.send('success');
          }).catch(console.error);
       } catch (err) {
        console.log(err);
        Sentry.captureException(new Error(err));
        res.sendStatus(500);
       }
    }

    async handleAddDanate(req, res, Sentry, DB){
        const ITEM = {
            campaignID: req.body.mydata.campaignID.toLowerCase(),
            donatorID: req.body.mydata.donatorID.toLowerCase(),
            raisedAmount: req.body.mydata.raisedAmount,
            tipAmount: req.body.mydata.tipAmount,
            transactionHash: req.body.mydata.transactionHash,
            chainId: req.body.mydata.chainId,
            coinAddress: req.body.mydata.coinAddress,
            blockChainOrt: req.body.mydata.blockChainOrt,
            donateDate: Date.now(),
            deleted: false,
            checked: false
        }
        try {
            const myCollection = await DB.collection('donations');
            await myCollection.insertOne(ITEM);
            res.send('success');
        } catch (err) {
            console.log("err- ", err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleAddCampaign(req, res, Sentry, DB, newWalletId) {
        const ITEM = {
            _id: req.body.mydata.id,
            beneficiaryId: req.user.email,
            ownerId: req.user.email,
            title: req.body.mydata.title,
            mainImageURL: req.body.mydata.mainImageURL,
            qrCodeImageURL: req.body.mydata.qrCodeImageURL,
            vl: req.body.mydata.vl,
            cn: req.body.mydata.cn,
            fn: req.body.mydata.fn,
            ln: req.body.mydata.ln,
            org: req.body.mydata.org,
            key: req.body.mydata.key,
            description: req.body.mydata.description,
            defaultDonationAmount: req.body.mydata.defaultDonationAmount,
            coinbaseCommerceURL: req.body.mydata.coinbaseCommerceURL,
            fiatPayments: req.body.mydata.fiatPayments,
            currencyName: req.body.mydata.currencyName,
            maxAmount: req.body.mydata.maxAmount,
            descriptionEditor: req.body.mydata.descriptionEditor,
            walletId: newWalletId,
            raisedAmount: 0,
            creationDate: Date.now(),
            lastDonationTime: 0,
            active: false,
            email: req.body.mydata.email,
            countryCode: req.body.mydata.countryCode,
            number: req.body.mydata.number,
            telegram: req.body.mydata.telegram,
            website: req.body.mydata.website,
            payout_address: req.body.mydata.payout_address,
            payout_chain: req.body.mydata.payout_chain,
            ethereum_address: req.body.mydata.ethereum_address,
            complete:req.body.mydata.complete,
            new: true
        }
        try {
            const myCollection = await DB.collection('campaigns');
            await myCollection.insertOne(ITEM);
            return true
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            return false;
        }
    }

    async handleUpdateCampaign(req, res, Sentry, DB) {
        let result;
        try {
            const myCollection = await DB.collection('campaigns');
            result = await myCollection.findOne({"_id" : req.body.mydata.address});
        } catch (err) {
            Sentry.captureException(new Error(err));
        }
        if(!result || result.ownerId != req.user.email) {
            Sentry.captureException(new Error(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.email})`));
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.email})`);
        } else {
            try{
                const myCollection = await DB.collection('campaigns');
                await myCollection.updateOne({'_id': req.body.mydata.address}, {$set: req.body.mydata.dataToUpdate});
                res.send('success');
            } catch (err) {
                console.log(err);
                Sentry.captureException(new Error(err));
                res.sendStatus(500);
            }
        }
    }

    async handleDeactivateCampaign(req, res, Sentry, DB) {
        let myCollection = await DB.collection("campaigns");
        let result = await myCollection.findOne({"_id" : req.body.id});
        if(!result || result.ownerId !== req.user.email) {
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.email})`);
        } else {
            try {
                const myCollection = await DB.collection('campaigns');
                await myCollection.updateOne({'_id': req.body.id}, {$set: {deleted:true}});
                res.send('success');
            } catch (err) {
                console.log(err);
                Sentry.captureException(new Error(err));
                res.sendStatus(500);
            }
        }
    }

    async handleLoadFinishedCampaigns(req, res, Sentry, DB) {
        try{
            let pipeline = [
                {$match: {$or:[{deleted:{ $exists : false}}, {deleted:false}], successful:true, active:false}},
                {$sort: {donate_count: -1, raisedOnCoinbase: -1, _id: 1}},
                {$skip : req.body.startRec},
                { $limit:req.body.compaignsCount}
            ];
            let pipeline1 = [
                { $match: {$or:[{deleted:{ $exists : false}}, {deleted:false}], successful:true, active:false}}
            ];   
            let curArr =  await DB.collection('campaigns').aggregate(pipeline).toArray();
            let curArr1 =  await DB.collection('campaigns').aggregate(pipeline1).toArray();
            let result = {curArr:curArr, arCount:curArr1.length};
            res.send(result);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleLoadAllCampaigns(req, res, Sentry, DB) {
        try{
            let pipeline = [
                {$lookup: {from :"campaign_wallet", localField: "_id", foreignField: "campaign_id", as : "wallet"}},
                {$lookup: {from :"donations", localField: "_id", foreignField: "campaignID", as : "donates"}},
                {$match: {$or:[{successful:false },{successful:{$exists : false}}], 
                 $or:[{deleted:{ $exists : false}}, {deleted:false}],"wallet":{ $ne : []},"active":true, complete:true}},
                 {$set: {wallet: {$arrayElemAt: ["$wallet.addres_base58",0]},donate_count:{$sum:{$arrayElemAt: ["$donates.raisedAmount",0]}}}},
                 {$sort: {donate_count: -1, raisedOnCoinbase: -1, _id: 1}},
                 { $skip : req.body.startRec},
                 { $limit: req.body.compaignsCount}
               ];
            let pipeline1 = [
                { $lookup: {from :"campaign_wallet", localField: "_id", foreignField: "campaign_id", as : "wallet"}},
                 { $match: {$or:[{successful:false },{successful:{$exists : false}}], 
                 $or:[{deleted:{ $exists : false}}, {deleted:false}],"wallet":{ $ne : []},"active":true, complete:true}}
               ];   
            let curArr =  await DB.collection('campaigns').aggregate(pipeline).toArray();
            let curArr1 =  await DB.collection('campaigns').aggregate(pipeline1).toArray();   
            let result = {curArr:curArr, arCount:curArr1.length};
            res.send(result);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleGetAllDonateForCampaign(req, res, Sentry, DB){
        try {
        let result = await DB.collection('donations').find({campaignID: req.body.mydata.campaignID});
        if (result.length == 0) res.send(0);
        else
        {
         const pipeline = [
          { $match: {campaignID: req.body.mydata.campaignID, deleted : false } },
           {$group: { _id: null, totalQuantity: { $sum: "$raisedAmount" } }}
         ];
         result = await DB.collection('donations').aggregate(pipeline).toArray();
         res.send(result);
        }
       } catch (err) {
        console.log(err);
        Sentry.captureException(new Error(err));
        res.send("error");
       }
    }

    async handleGetAllDonateForList(req, res, Sentry, DB){
        try {
            const pipeline = [
                { $match: { deleted : false } },
                {$group: { _id: '$campaignID', totalQuantity: {$sum: "$raisedAmount"}}}
            ];
            let result = await DB.collection('donations').aggregate(pipeline).toArray();
            res.send(result);
       } catch (err) {
        console.log(err);
        Sentry.captureException(new Error(err));
        res.sendn("error");
       }
    }

    async handleGetId(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('campaigns');
            let result = await myCollection.findOne({"key" : req.body.KEY, "deleted":{ $exists : false }});
            if (result) res.send(result._id)
            else res.send(req.body.KEY);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handlecheckKey(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('campaigns');
            let result = await myCollection.findOne({"key" : req.body.KEY, "deleted":{ $exists : false }});
            if (result) res.send(true)
            else res.send(false);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleGetCoinsList(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('coins_for_chains');
            let coins = await myCollection.find();//aggregate([{$group:{ _id : "$chain", coins:{$push: "$coin"}}}]);
            const result = await coins.toArray();
            res.send(result);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleGetTipForHeo(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('global_configs');
            let result = await myCollection.findOne({"_id" : "tip_for_heo"});
            if (result) res.send(result.percent);
            else res.send('0');
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleGetChainsLis(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('coins_for_chains');
            let chains = await myCollection.distinct("chain");
            const result = await chains.toArray();
            res.send(result._id);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleUpdateCampaignWallet(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('campaign_wallet');
            await myCollection.updateOne({'campaign_id': req.body.mydata.campaignID, 'wallet_ort': req.body.mydata.blockChainOrt}, 
            {$inc: {"donate_count":req.body.mydata.raisedAmount, "heo_donate":req.body.mydata.tipAmount}});
            return true;
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleLoadOneCampaign(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('campaigns');
            const walletColection = await DB.collection('campaign_wallet');
            const configCollection = await DB.collection('chain_configs');
            let config_tron = await configCollection.findOne({"_id" : process.env.TRON_CHAIN.toString()});
            let config_eth = await configCollection.findOne({"_id" : process.env.CHAIN.toString()});
            let result = await myCollection.findOne({"_id" : req.body.ID });
            let donate = await DB.collection('donations').find({campaignID: req.body.ID}).toArray();
            let campaign_wallets = await walletColection.find({"campaign_id" : req.body.ID}).
                project({_id:0,wallet_ort:1,addres_base58:1,addres_hex:1,coin_name:1}).toArray();
            for(let i=0; i<campaign_wallets.length; i++) {
                if(campaign_wallets[i].wallet_ort === 'Tron') {
                    campaign_wallets[i].chainId = process.env.TRON_CHAIN.toString();
                    campaign_wallets[i].coin_addres = config_tron.currencyOptions.value;
                }
                else if(campaign_wallets[i].wallet_ort === 'Ethereum') {
                    campaign_wallets[i].chainId = process.env.CHAIN.toString();
                    campaign_wallets[i].coin_addres = config_eth.currencyOptions.value;
                }
                else campaign_wallets[i].chainId = "";
            }   
            result.campaign_wallets = campaign_wallets;
            result.totalQuantity = 0;
            for(let i=0; i<donate.length; i++) result.totalQuantity += donate[i].raisedAmount;
            res.send(result);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleLoadUserCampaigns(req, res, Sentry, DB) {
        try{
            const myCollection = await DB.collection('campaigns');
            const campaigns = await myCollection.find({"ownerId" : {$eq: req.user.email}, "deleted":{ $exists : false }});
            const result = await campaigns.toArray();
            res.send(result);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async handleLoadEnv(res, envCHAIN, envTRONCHAIN, Sentry, DB) {
        try{
            let chainCollection = await DB.collection('chain_configs');
            let chain_configsRaw = await chainCollection.find();
            let chain_configs = await chain_configsRaw.toArray();
            var chains = {};
            for (let i=0; i<chain_configs.length; i++) {
                chains[chain_configs[i]._id] = chain_configs[i];
            }
            let globalCollection = await DB.collection('global_configs');
            let global_configsRaw = await globalCollection.find({_id : 'FIATPAYMENT'});
            let global_configs = await global_configsRaw.toArray();
            res.json(
                {
                    CHAINS: chains,
                    CHAIN: envCHAIN,
                    TRON_CHAIN: envTRONCHAIN,
                    GLOBALS: global_configs,
                });

        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    //create initial payment record in mongodb
    async createPaymentRecord(data, CLIENT, DBNAME, Sentry) {
        console.log('creating payment record' + data);
        const DB = CLIENT.db(DBNAME);
        try {
            const myCollection = await DB.collection('fiat_payment_records');
            await myCollection.insertOne(data);
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    //update payment record in mongodb
    async updatePaymentRecord(recordId, data, CLIENT, DBNAME, Sentry) {
        const DB = CLIENT.db(DBNAME);
        try{
            const myCollection = await DB.collection('fiat_payment_records');
            await myCollection.updateOne({'_id': recordId}, {$set: data});
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }
    }

    async authenticated(req, res, Sentry) {
        if(req.user && req.user.email) {
          return true;
        } else {
            Sentry.captureException(new Error('Failed 401'));
            res.sendStatus(401);
            return false;
        }
    }

    async handleGetFiatPaymentSettings(DB, Sentry) {
        try {
            let configCollection = await DB.collection('global_configs');
            let fiatSettingsRAW = await configCollection.find({_id : 'FIATPAYMENT'});
            let fiatSettings = await fiatSettingsRAW.toArray();
            if(fiatSettings[0].enabled) {
                if (fiatSettings[0].STRIPE) {
                    return 'stripeLib';
                } else if(fiatSettings[0].CIRCLE) {
                    return 'circleLib';
                } else if (fiatSettings[0].PAYADMIT) {
                    return 'payadmitLib';
                }
            }
            return;
        } catch (err) {
            console.log(err);
            Sentry.captureException(new Error(err));
        }
    }

    async handleGetCountInPage(res, Sentry, DB) {
        try {
            let configCollection = await DB.collection('global_configs');
            let fiatSettingsRAW = await configCollection.find({_id : 'campaigns_per_page'});
            let fiatSettings = await fiatSettingsRAW.toArray();
            res.send(fiatSettings[0].count);
        } catch (err){
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        } 
    }

    async handleGetCountInFinashpage(res, Sentry, DB) {
        try {
            let configCollection = await DB.collection('global_configs');
            let fiatSettingsRAW = await configCollection.find({_id : 'finish_canpaigns_per_page'});
            let fiatSettings = await fiatSettingsRAW.toArray();
            res.send(fiatSettings[0].count);
        } catch (err){
            console.log(err);
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        } 
    }
}

module.exports = ServerLib;

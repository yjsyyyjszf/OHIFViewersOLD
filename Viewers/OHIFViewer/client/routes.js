import { Meteor } from "meteor/meteor";
import { Router } from 'meteor/clinical:router';
import { Session } from 'meteor/session';
import { OHIF } from 'meteor/ohif:core';

Router.configure({
    layoutTemplate: 'layout',
});


// If we are running a disconnected client similar to the StandaloneViewer
// (see https://docs.ohif.org/standalone-viewer/usage.html) we don't want
// our routes to get stuck while waiting for Pub / Sub.
//
// In this case, the developer is required to add Servers and specify
// a CurrentServer with some other approach (e.g. a separate script).
if (Meteor.settings &&
    Meteor.settings.public &&
    Meteor.settings.public.clientOnly !== true) {
    Router.waitOn(function() {
        return [
            Meteor.subscribe('servers'),
            Meteor.subscribe('currentServer')
        ];
    });
}


/*Router.onBeforeAction(function() {
    // verifyEmail controls whether emailVerification template will be rendered or not
    const publicSettings = Meteor.settings && Meteor.settings.public;
    const verifyEmail = publicSettings && publicSettings.verifyEmail || false;

    // Check if user is signed in or needs an email verification
    if (!Meteor.userId() && !Meteor.loggingIn()) {
        this.render('entrySignIn');
    } else if (verifyEmail && Meteor.user().emails && !Meteor.user().emails[0].verified) {
        this.render('emailVerification');
    } else {
        this.next();
    }
}, {
    except: ['entrySignIn', 'entrySignUp', 'forgotPassword', 'resetPassword', 'emailVerification']
});*/

Router.onBeforeAction(function() {

    const userLogin=Session.get('userLogin');
    // Check if user is signed in or needs an email verification
   
    if (!userLogin) {
        this.render('login');
    } else {
        console.log("Usuario loegado : " + userLogin);
        this.next();
    }
}, {

    except: ['login','logout','viewerStudiesWithLogin']
});



Router.onBeforeAction('loading');

Router.route('/', function() {
    Router.go('login', {}, { replaceState: true });
}, { name: 'home' });

Router.route('/logout', function() {

    Session.clear('userLogin');
    //delete Session.clearPersistent();
    Router.go('login', {}, { replaceState: true });
},{name:'logout'});

Router.route('/login', function(url) {
    this.render('login');
},{name:'login'});


Router.route('/studylist', function() {
    this.render('ohifViewer', { data: { template: 'studylist' } });
}, { name: 'studylist' });

Router.route('/viewer/:studyInstanceUids', function() {
    const studyInstanceUids = this.params.studyInstanceUids.split(';');
    OHIF.viewerbase.renderViewer(this, { studyInstanceUids }, 'ohifViewer');
}, { name: 'viewerStudies' });

Router.route('/viewer/:studyInstanceUids/user/:userInstance/password/:passwordInstance', function() {
    const studyInstanceUids = this.params.studyInstanceUids.split(';');
    const user = this.params.userInstance;
    const password = this.params.passwordInstance;
    var thisRouter=this;
    var   existUser = validarUsuario(user,password)
        .then(function () {
            OHIF.viewerbase.renderViewer(thisRouter, { studyInstanceUids }, 'ohifViewer');
        })
        .catch(function () {
            //Router.go('login', {}, { replaceState: true });
            thisRouter.render('login');
        });
}, { name: 'viewerStudiesWithLogin' });


// OHIF #98 Show specific series of study
Router.route('/study/:studyInstanceUid/series/:seriesInstanceUids', function () {
    const studyInstanceUid = this.params.studyInstanceUid;
    const seriesInstanceUids = this.params.seriesInstanceUids.split(';');
    OHIF.viewerbase.renderViewer(this, { studyInstanceUids: [studyInstanceUid], seriesInstanceUids }, 'ohifViewer');
}, { name: 'viewerSeries' });

function validarUsuario(user,password)
{
    return new Promise(
        function (resolve, reject) {
            Meteor.call('validateUser',{user:user,password:password,encriptado:true},
                (error, result) => {
                    if (error) {
                        reject(Meteor.Error('user-not-found', "Can't find user"));
                    }else{
                        if(result) {
                            Session.setPersistent('userLogin', user);
                            resolve(true);
                        }else{
                            reject(Meteor.Error('user-not-found', "Can't find user"));
                        }
                    }
                }
            );
        });
};



Router.route('/IHEInvokeImageDisplay', function() {
    const requestType = this.params.query.requestType;

    if (requestType === "STUDY") {
        const studyInstanceUids = this.params.query.studyUID.split(';');

        OHIF.viewerbase.renderViewer(this, {studyInstanceUids}, 'ohifViewer');
    } else if (requestType === "STUDYBASE64") {
        const uids = this.params.query.studyUID;
        const decodedData = window.atob(uids);
        const studyInstanceUids = decodedData.split(';');

        OHIF.viewerbase.renderViewer(this, {studyInstanceUids}, 'ohifViewer');
    } else if (requestType === "PATIENT") {
        const patientUids = this.params.query.patientID.split(';');

        Router.go('studylist', {}, {replaceState: true});
    } else {
        Router.go('studylist', {}, {replaceState: true});
    }
});

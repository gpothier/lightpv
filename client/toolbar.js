Template.toolbar.helpers({
});

// Open Client
openClientDialog = function() {
	openClientDialogViewModel.cash("");
	AntiModals.overlay("openClient", {
		modal: true,
	});
};

function OpenClientDialogViewModel() {
	this.cash = ko.observable();
	
	this.canConfirm = ko.computed(function() {
		var cash = filterInt(this.cash());
		return ! isNaN(cash);
	}.bind(this));
	
	this.confirm = function() {
		var cash = filterInt(this.cash());
		if (isNaN(cash)) {
			alert("Monto inválido");
			return;
		}
        Meteor.call("openClient", cash, function(error, result) {
        	if (error) alert(error);
        	else AntiModals.dismissOverlay($("#open-client-dialog"), null, null);
        });
	}.bind(this);
	
	this.cancel = function() {
        AntiModals.dismissOverlay($("#open-client-dialog"), null, null);
	}.bind(this);
}

Meteor.startup(function() {
	openClientDialogViewModel = new OpenClientDialogViewModel();
	
	Template.openClient.rendered = function() {
		ko.applyBindings(openClientDialogViewModel, $("#open-client-dialog")[0]);
	};
});	

// Close Client
closeClientDialog = function() {
	closeClientDialogViewModel.cash("");
	AntiModals.overlay("closeClient", {
		modal: true,
	});
};

function CloseClientDialogViewModel() {
	this.cash = ko.observable();
	
	this.canConfirm = ko.computed(function() {
		var cash = filterInt(this.cash());
		return ! isNaN(cash);
	}.bind(this));
		
	this.confirm = function() {
		var cash = filterInt(this.cash());
		if (isNaN(cash)) {
			alert("Monto inválido");
			return;
		}
        Meteor.call("closeClient", cash, function(error, result) {
        	if (error) alert(error);
        	else AntiModals.dismissOverlay($("#close-client-dialog"), null, null); 
        });
	}.bind(this);
	
	this.cancel = function() {
        AntiModals.dismissOverlay($("#close-client-dialog"), null, null);
	}.bind(this);
}

Meteor.startup(function() {
	closeClientDialogViewModel = new CloseClientDialogViewModel();
	
	Template.closeClient.rendered = function() {
		ko.applyBindings(closeClientDialogViewModel, $("#close-client-dialog")[0]);
	};
});	

// Withdraw
withdrawDialog = function() {
	withdrawDialogViewModel.cash("");
	withdrawDialogViewModel.password("");
	AntiModals.overlay("withdraw", {
		modal: true,
	});
};

function WithdrawDialogViewModel() {
	this.cash = ko.observable();
	this.password = ko.observable();
	
	this.canConfirm = ko.computed(function() {
		var cash = filterInt(this.cash());
		return ! isNaN(cash);
	}.bind(this));
		
	this.confirm = function() {
		var cash = filterInt(this.cash());
		if (isNaN(cash)) {
			alert("Monto inválido");
			return;
		}
        Meteor.call("withdrawCash", cash, this.password(), function(error, result) {
        	if (error) alert(error);
	        else AntiModals.dismissOverlay($("#withdraw-dialog"), null, null);
        });
        this.password("");
	}.bind(this);
	
	this.cancel = function() {
        AntiModals.dismissOverlay($("#withdraw-dialog"), null, null);
        this.password("");
	}.bind(this);
}

Meteor.startup(function() {
	withdrawDialogViewModel = new WithdrawDialogViewModel();
	
	Template.withdraw.rendered = function() {
		ko.applyBindings(withdrawDialogViewModel, $("#withdraw-dialog")[0]);
	};
});	

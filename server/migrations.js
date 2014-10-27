Migrations.add({
	version: 1,
	name: "Update ids of products to match those on lightpv-server",
	up: function() {
		console.log("Current client: "+LighTPV.client);
		if (! LighTPV.client) throw new Meteor.Error("Cannot migrate before associating client");

		var oldProducts = Products.find().fetch();
		var oldProductIdToPSIDMap = {};
		for(var i=0;i<oldProducts.length;i++) {
			var product = oldProducts[i];
			oldProductIdToPSIDMap[product._id] = product.ps_id;
			console.log("Old product: "+product._id+" => "+product.ps_id);
		}
			
		var newProducts = LighTPV.serverConnection.call("getProducts", LighTPV.client._id, LighTPV.client.token);
		var newProductPSIDToIdMap = {};
		for(var i=0;i<newProducts.length;i++) {
			var product = newProducts[i];
			newProductPSIDToIdMap[product.ps_id] = product._id;
			console.log("New product: "+product.ps_id+" => "+product._id);
		}

		Sales.find().forEach(function(sale) {
			console.log("Processing sale: "+sale._id+": "+JSON.stringify(sale));
			var newItems = sale.items.map(function(item) {
				console.log("Processing item: "+JSON.stringify(item));
				var psid = oldProductIdToPSIDMap[item.product];
				if (! psid) throw new Meteor.Error("Old product not found: "+item.product);
				
				var pid = newProductPSIDToIdMap[psid];
				if (! pid) throw new Meteor.Error("New product not found: "+psid);
				
				return { product: pid, qty: item.qty };
			});
			
			Sales.update(sale, {$set: {items: newItems, client: LighTPV.client._id}});
		});
		
		for(var i=0;i<oldProducts.length;i++) {
			var product = oldProducts[i];
			Products.remove(product);
		}
		
		if (Products.find().count() != 0)
			throw new Meteor.Error("INTERNAL ERROR: Migration failed - some products remain");
			
		for(var i=0;i<newProducts.length;i++) {
			var product = newProducts[i];
			Products.insert(product);
		}

	},
	down: function() {
		throw new Meteor.Error("Not supported");
	}
});

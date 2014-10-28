Migrations.add({
	version: 1,
	name: "Update ids of products to match those on lightpv-server",
	up: function() {
		var oldProducts = Products.find().fetch();
		
		console.log("Found "+oldProducts.length+" products");
		
		var oldProductIdToPSIDMap = {};
		for(var i=0;i<oldProducts.length;i++) {
			var product = oldProducts[i];
			oldProductIdToPSIDMap[product._id] = product.ps_id;
		}
			
		Sales.find().forEach(function(sale) {
			var newItems = sale.items.map(function(item) {
				var psid = oldProductIdToPSIDMap[item.product];
				if (! psid) throw new Meteor.Error("Old product not found: "+item.product);
				
				return { product: psid, qty: item.qty };
			});
			
			Sales.update(sale, {$set: {items: newItems}});
		});
		
		for(var i=0;i<oldProducts.length;i++) {
			var product = oldProducts[i];
			Products.remove(product._id);

			product._id = product.ps_id;
			delete product["ps_id"];
			
			Products.insert(product);
		}

		console.log("After migration: "+Products.find().count()+" products");

	},
	down: function() {
		throw new Meteor.Error("Not supported");
	}
});

Migrations.add({
	version: 2,
	name: "Add sale.item.price and sale.total",
	up: function() {
		var sales = Sales.find().fetch();
		sales.forEach(function(sale) {
			var total = 0;
			sale.items.forEach(function(item) {
				var product = Products.findOne(item.product);
				item.price = product.price;
				var subtotal = item.qty * item.price;
				total += subtotal;
			});
			
			sale.total = Math.round(total * (100-sale.discount)/100);
			
			Sales.update(sale._id, {$set: {items: sale.items, total: sale.total}});
		});
	},
	down: function() {
		throw new Meteor.Error("Not supported");
	}
});


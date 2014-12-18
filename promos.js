/**
 * Applies the given MxN promo to the cart items.
 * Appends the resulting promo application info to the 
 * appliedPromotions list
 */
applyMxNPromo = function(promo, cartItems, appliedPromotions) {
	var c = 0;
	var product = null;
	for(var i=0;i<cartItems.length;i++) {
		var item = cartItems[i];
		var itemProductId = typeof item.product == "object" ? item.product._id : item.product;
		if (itemProductId == promo.productId) {
			c += item.qty;
			if (product == null) product = typeof item.product == "object" ? item.product : Products.findOne(item.product);
		} 
	}
	
	var times = Math.floor(c/promo.m);
	if (times > 0) {
		var value = product.price * times * (promo.m - promo.n);
		appliedPromotions.push({promotion: promo, timesApplied: times, discountValue: value});
	}
};

/**
 * Applies the given Percentage promo to the cart items.
 * Appends the resulting promo application info to the 
 * appliedPromotions list
 */
applyPercentagePromo = function(promo, cartItems, appliedPromotions) {
	var times = 0;
	var total = 0;
	for(var i=0;i<cartItems.length;i++) {
		var item = cartItems[i]; 
		var itemProductId = typeof item.product == "object" ? item.product._id : item.product;
		if (itemProductId == promo.productId) {
			times += item.qty;
			var itemProduct = typeof item.product == "object" ? item.product : Products.findOne(item.product);
			total += item.qty * itemProduct.price; 
		} 
	}
	
	if (value > 0) {
		var value = Math.floor(total * (100-promo.p)/100);
		appliedPromotions.push({promotion: promo, timesApplied: times, discountValue: value});
	}
};

appliedPromotions = function(date, cartItems) {
	query = { "startDate": { "$lte": date }, "endDate": { "$gte": date }};
	
	var appliedPromotions = [];
	Promotions.find(query).forEach(function(promo) {
		if (promo.type == "mxn") applyMxNPromo(promo, cartItems, appliedPromotions);
		else if (promo.type == "percentage") applyPercentagePromo(promo, cartItems, appliedPromotions);
		else throw "Unknown promotion type: "+promo.type;
	});
	
	return appliedPromotions;
};

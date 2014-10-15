Meteor.startup(function() {
  Session.set('discount', 0);
  Meteor.autorun(function() {
    var t = getParameter("currentTime");
    Meteor.subscribe("daySales", t);
  });
});

/*
  SaleItem
  --------
  timestamp
  product
  qty
*/
CartItem = function (doc) {
  _.extend(this, doc);
};
_.extend(CartItem.prototype, {
  total: function () {
    return this.product.price * this.qty;
  }
});

CartItems = new Mongo.Collection(null, {
  transform: function (doc) { return new CartItem(doc); }
});

Template.cart.items = function () {
  return CartItems.find({}, {sort: {timestamp: -1}});
};

Template.cart.events({
  "click .dec button": function (event) {
    incItemQty(this, -1);
  },
  "click .inc button": function (event) {
    incItemQty(this, 1);
  },
  "click .remove button": function (event) {
    removeItem(this);
  }
});

addToCart = function(product) {
  var item = findItemByProduct(product);
  if (item) {
    incItemQty(item, 1);
  } else {
    CartItems.insert({product: product, qty: 1, timestamp: new Date()});
  }
}

function findItemByProduct(product) {
  var result = null;
  CartItems.find().forEach(function(item) {
    if (item.product._id == product._id) result = item;
  });
  return result;
}

addToCartByEan13 = function(ean13) {
  console.log('Trying to add: '+ean13);
  var product = findProductByEan13(ean13);
  if (product) {
    addToCart(product);
    playSound('beep-07.mp3');
  } else {
    playSound('beep-03.mp3');
  }
}

function findProductByEan13(ean13) {
  var result = null;
  Products.find().forEach(function(product) {
    if (product.ean13 == ean13) result = product;
  });
  return result;
}

incItemQty = function(item, amount) {
  if (item.qty + amount < 1) return;
  CartItems.update(item, {$inc: {qty: amount}, $set: {timestamp: new Date()}});
}

removeItem = function(item) {
  CartItems.remove(item);
}

Template.sale.subtotal = function() {
  var result = 0;
  CartItems.find().forEach(function(item) {
    result += item.total();
  });
  return result;
}

Template.sale.discount = function() {
  return Session.get('discount');
}

Template.sale.total = function() {
  return Math.round(Template.sale.subtotal() * (100-Session.get('discount'))/100);
}


Template.sale.events({
  "click button#confirm-sale-cash": function (event) {
    if (confirm("Pago en efectivo exitoso?")) confirmSale('cash');
  },
  "click button#confirm-sale-card": function (event) {
    if (confirm("Pago con tarjeta exitoso?")) confirmSale('card');
  },
  "click button#cancel-sale": function (event) {
    if (confirm("Seguro de vaciar el carro?")) cancelSale();
  },
  "change #discount-selector": function(event) {
    var discount = parseInt($(event.target).val());
    Session.set("discount", discount);
  }
});

function confirmSale(paymentMethod) {
  var total = 0;
  var items = CartItems.find().map(function(item) {
    total += item.total();
    return {product: item.product._id, qty: item.qty, timestamp: item.timestamp};
  });
  var discount = Session.get('discount');
  total = Math.round(total * (100-discount)/100);

  Meteor.call('createSale', items, discount, total, paymentMethod, function(error, result) {
    if (error) {
      alert('No se pudo confirmar la venta: '+error)
    } else {
      CartItems.remove({});
    }
  });
}

function cancelSale() {
  CartItems.remove({});
}

Template.daySales.dayTotal = function(paymentMethod) {
  var filter = paymentMethod ? {paymentMethod: paymentMethod} : {}
  var total = 0;
  Sales.find(filter).forEach(function(sale) {
    total += sale.total();
  });
  return total;
}

Template.daySales.sales = function () {
  return Sales.find({}, {sort: {timestamp: -1}});
};

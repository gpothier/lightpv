
/*
  Products
  --------
  ps_id: prestashop product id
  name: product name
  ean13: EAN13 code of the product
  price: product price
*/
Products = new Mongo.Collection("products");


/*
  Sale
  ----
  user
  timestamp
  items[]
    product
    qty
  discount
*/
Sale = function (doc) {
  _.extend(this, doc);
  this.items.forEach(function(item) {
    item.product = Products.find(item.product).fetch()[0];
  });
};
_.extend(Sale.prototype, {
  total: function () {
    var total = 0;
    this.items.forEach(function(item) {
      total += item.qty * item.product.price;
    });
    return total * (100-this.discount)/100;;
  }
});

Sales = new Mongo.Collection("sales", {
  transform: function (doc) { return new Sale(doc); }
});

/*
  Parameter
  ---------
  name
  value
*/
Parameters = new Mongo.Collection("parameters");

getParameter = function(name) {
  var p = Parameters.find({name: name}).fetch();
  return p.length > 0 ? p[0].value : null;
}

setParameter = function(name, value) {
  Parameters.update(
        {name: name},
        {$set: {value: value}},
        {upsert: true});
}

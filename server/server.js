Meteor.publish("products", function () {
  return Products.find();
});

Tracker.autorun(function () {
  Meteor.publish("daySales", function (date) {
    if (! date) return null;

    date.setHours(0, 0, 0, 0);
    return Sales.find({user: this.userId, timestamp: {$gte: date}});
  });
});

Meteor.publish("parameters", function() {
  return Parameters.find();
});

Meteor.methods({
  createSale: function (items, discount, total, paymentMethod) {
    if (! Meteor.userId()) throw new Meteor.Error('No autenticado.');
    if (discount > 10) throw new Meteor.Error('Invalid discount');

    var total_ref = 0;

    items.forEach(function(item) {
      var product = Products.find(item.product).fetch()[0];
      var subtotal = item.qty * product.price;
      total_ref += subtotal;
    });
    total_ref = Math.round(total_ref * (100-discount)/100);
    if (total_ref != total) throw new Meteor.Error('Totals do not match: '+total+' != '+total_ref);

    var ts = new Date();
    console.log('Adding sale ('+ts+'): $'+total+'('+paymentMethod+') ['+Meteor.user().username+'], '+discount+'% - '+JSON.stringify(items));

    Sales.insert({
      user: Meteor.userId(),
      timestamp: ts,
      items: items,
      discount: discount,
      paymentMethod: paymentMethod});
    return true;
  }
});

Meteor.startup(function () {
  if (Meteor.users.find().count() === 0) {
    console.log("Adding initial admin data");
    var id = Accounts.createUser({
      username:"admin",
      email:"admin@luki.cl",
      password:"admin2550",
      admin: true,
      profile: {name:"Administrator"}});
    Roles.addUsersToRoles(id, ['admin', 'manage-users']);
  }

  Meteor.setInterval(function() {
    setParameter('currentTime', new Date());
  }, 60*60*1000);
});

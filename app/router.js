if (Meteor.isClient) {
  Router.configure({
    layoutTemplate: 'appLayout'
  });

  Router.route('/pedidos', function() {
    this.render('pedidos');
  });

  Router.route('/', function() {
    this.render('main');
  });

  Router.route('/misPedidos', function() {
    this.render('userPedidos');
  });
}

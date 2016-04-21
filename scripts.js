Pedidos = new Mongo.Collection("pedidos");

Meteor.methods({
  nuevoUsuario: function(user) {
    if (Meteor.user().profile.admin !== true) {
      // If the pedido is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }
    //Create user
    //TODO: Maybe send the user object itself?
    //Comprobar contraseñas y si son iguales, crear usuario
    Accounts.createUser({
      email: user.email,
      password: user.password,
      profile: {
        name: user.name,
        lastName: user.lastName,
        dir: user.dir,
        tel: user.tel,
        admin: user.admin
      }
    });
    console.log("Se agregó el usuario: " + user.email);
  },
  addPedido: function(pedido) {
    // Make sure user is logged in
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    //Inserta un pedido a la base de datos
    Pedidos.insert({
      pedido: pedido.platillo,
      agua: pedido.agua,
      unLitro: pedido.unLitro,
      createdAt: new Date(),
      owner: Meteor.userId(),
      name: Meteor.user().profile.name + " " + Meteor.user().profile.lastName,
      dir: Meteor.user().profile.dir,
      tel: Meteor.user().profile.tel,
      estado: "Solicitado"
    });
  },
  deletePedido: function(pedidoId) {
    var pedido = Pedidos.findOne(pedidoId);
    //Make sure user is logged in
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    //Quita un pedido de la base de datos
    Pedidos.remove(pedidoId);
  },
  setChecked: function(pedidoId, setChecked) {
    var pedido = Pedidos.findOne(pedidoId);
    if (Meteor.user().profile.admin !== true) {
      // If the pedido is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Pedidos.update(pedidoId, {
      $set: {
        checked: setChecked
      }
    });
  },
  setPrivate: function(pedidoId, setToPrivate) {
    var pedido = Pedidos.findOne(pedidoId);

    // Make sure only the pedido owner can make a pedido private
    if (pedido.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Pedidos.update(pedidoId, {
      $set: {
        private: setToPrivate
      }
    });
  },
  setState: function(pedidoId, estado) {
    var pedido = Pedidos.findOne(pedidoId);

    if (Meteor.user().profile.admin !== true) {
      throw new Meteor.Error("not-authorized");
    }

    Pedidos.update(pedidoId, {
      $set: {
        estado: estado
      }
    })
    console.log("Se cambió el estado del pedido " + pedidoId + " a " + estado);
  }
});

if (Meteor.isClient) {

  Meteor.subscribe("pedidos");

  Template.sideBar.events({
    'submit #loginForm': function(event) {
      event.preventDefault();
      var emailVar = event.target.loginEmail.value;
      var passwordVar = event.target.loginPassword.value;
      Meteor.loginWithPassword(emailVar, passwordVar);
    },
    'click .logout': function(event) {
      event.preventDefault();
      Meteor.logout();
    }
  });

  Template.userPedidos.helpers({
    pedidos: function() {
      //Solamente pedis los pedidos del usuario
      return Pedidos.find({}, {
        sort: {
          createdAt: -1
        }
      });
    }
  });

  Template.pedidos.helpers({
    pedidos: function() {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter pedidos
        return Pedidos.find({
          checked: {
            $ne: true
          }
        }, {
          sort: {
            createdAt: -1
          }
        });
      } else {
        // Otherwise, return all of the pedidos
        return Pedidos.find({}, {
          sort: {
            createdAt: -1
          }
        });
      }
    },
    hideCompleted: function() {
      return Session.get("hideCompleted");
    },
    incompleteCount: function() {
      return Pedidos.find({
        checked: {
          $ne: true
        }
      }).count();
    }
  });

  Template.pedidos.events({
    "submit .new-task": function(event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var pedido = event.target.text.value;

      // Insert a task into the collection
      Meteor.call("addPedido", pedido);

      // Clear form
      event.target.text.value = "";
    },

    "change .hide-completed input": function(event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.pedido.helpers({
    isOwner: function() {
      return this.owner === Meteor.userId();
    }
  });

  Template.miPedido.helpers({
    isOwner: function() {
      return this.owner === Meteor.userId();
    }
  });

  Template.pedido.events({
    "click .toggle-checked": function() {
      // Marca un pedido como finalizado
      Meteor.call("setChecked", this._id, !this.checked);
    },
    "click .delete": function() {
      //Elimina un pedido
      Meteor.call("deletePedido", this._id);
    },
    "click .cambiar-estado": function(event) {
      //Cambia el estado de un pedido
      var estado = event.target.value;
      $(event.target).siblings().removeClass('active');
      $(event.target).addClass('active');
      Meteor.call("setState", this._id, estado);
      if (estado === "Pagado") {
        Meteor.call("setChecked", this._id, true);
      } else {
        Meteor.call("setChecked", this._id, false);
      }
    }
  });

  Template.newUserModal.events({
    "submit #newUserForm": function(event) {
      event.preventDefault();
      console.log("Registrando nuevo usuario");
      var user = {
        name: event.target.registerName.value,
        lastName: event.target.registerLastName.value,
        email: event.target.registerEmail.value,
        password: event.target.registerPassword.value,
        passwordConf: event.target.registerPasswordConfirmation.value,
        admin: event.target.registerAdmin.checked,
        dir: event.target.registerDir.value,
        tel: event.target.registerTel.value
      };
      Meteor.call("nuevoUsuario", user, function(err) {
        if (err)
          console.log(err);
        setTimeout(function() {
          $('#newUserModal').modal('hide');
        }, 2000);
        //Show success message
        $('#newUserSuccess').removeAttr('hidden');
        console.log("Exito");
      });

    }
  });

  Template.newOrderModal.events({
    "submit #newOrderForm": function(event) {
      event.preventDefault();
      console.log("Nueva orden");
      var pedido = {
        platillo: event.target.platillo.value,
        agua: event.target.agua.value,
        unLitro: event.target.unLitro.checked
      };
      Meteor.call("addPedido", pedido, function(err) {
        if (err)
          console.log(err);
        setTimeout(function() {
          $('#newOrderModal').modal('hide');
        }, 2000);
        //Show success message
        $('#newOrderSuccess').removeAttr('hidden');
        console.log("Exito");
      });

    }
  })

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

if (Meteor.isServer) {
  // This code only runs on the server
  //Cambia los pedidos publicados
  Meteor.publish("pedidos", function() {
    return Pedidos.find({})
  });

  Meteor.startup(function() {
    // code to run on server at startup
  });
}

paypal
  .Buttons({
    createOrder: function () {
      return fetch("/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: 3,
              quantity: 1,
            },
          ],
        }),
      })
        .then((res) => {
          if (res.ok) return res.json();
          return res.json().then((json) => Promise.reject(json));
        })
        .then(({ id }) => {
          return id;
        })
        .catch((e) => {
          console.error(e.error);
        });
    },
    onApprove: function (data, actions) {
      return actions.order.capture().then(function (orderData) {
        // Full available details
        console.log(
          "Capture result",
          orderData,
          JSON.stringify(orderData, null, 2)
        );

        // Show a success message within this page, e.g.
        // const element = document.getElementById("paypal");
        // element.innerHTML = "";
        // element.innerHTML = "<h3>Thank you for your payment!</h3>";
        actions.redirect("http://localhost:3001/");

        // Or go to another URL:  actions.redirect('thank_you.html');
      });
    },
    onError: function (err) {
      // console.log(err);
    },
  })
  .render("#paypal");

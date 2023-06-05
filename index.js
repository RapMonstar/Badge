const express = require("express");
const axios = require("axios");

const username = "admin@dolgovdmit";
const password = "5d7ad8e9fb";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/orders", (req, res) => {
  const formHtml = `
  <html>
  <head>
    <link rel="stylesheet" type="text/css" href="/styles.css">
  </head>
  <body>
    <div class="container">
      <form action="/orders" method="post">
        <label for="orderId">Order ID:</label>
        <input type="text" id="orderId" name="orderId" required>
        <button type="submit">Submit</button>
      </form>
    </div>
  </body>
  </html>
`;
  res.send(formHtml);
});
app.get("/orders/:orderId", async (req, res) => {
  const orderId = req.params.orderId;

  try {
    let order = await getCustomerOrderById(orderId);
    if (order) {
      const positions = await getCustomerOrderPositions(orderId);
      order.positions = positions;

      // Add timeline-based status to the order
      order = getStatusByTimeline(order);

      let formattedOrder = `
      <html>
      <head>
        <link rel="stylesheet" type="text/css" href="/styles.css">
        <style> 
        </style>
      </head>
      <body>
        <div class="container">       
      `;
      formattedOrder += `<h2>Номер Заказа:</h2><p>${orderId}</p>`;

      formattedOrder += "<h2>Товары:</h2>";
      let index = 0;
      if (positions && positions.length > 0) {
        for (const position of positions) {
          index++;
          formattedOrder += `<p><strong>Товар ${index}:</strong> ${position.assortment.name}</p>`;
        }

        for (const position of positions) {
          const baseProductLink = await getBaseProductLink(
            position.assortment.id
          );
          const baseProductId = baseProductLink
            ? baseProductLink.split("/").pop()
            : null;

          if (baseProductId) {
            const images = await getProductImages(baseProductId);
            if (images && images.length > 0) {
              for (const image of images) {
                formattedOrder += `<img src="${image.miniature.href}" class="product-image">`;
              }
            } else {
              formattedOrder += "<p>No product images found</p>";
            }
          } else {
            formattedOrder += "<p>Unable to retrieve product images</p>";
          }
        }
      } else {
        formattedOrder += "<p>No positions found</p>";
      }

      formattedOrder += `<p><strong>Описание:</strong> ${order.description.replace(
        /\n/g,
        "<br>"
      )}</p>`;

      formattedOrder += `<h2>&nbsp;&nbsp;&nbsp;Статус заказа:</h2>`;
      if (order.statuses?.length > 0) {
        for (const status of order.statuses) {
          if (status.ready) {
            formattedOrder += " (готово)";
          } else if (status.current) {
            formattedOrder += `&nbsp;&nbsp;&nbsp;<span class="status-dot completed"></span>`;
            formattedOrder += `<strong>&nbsp;&nbsp;&nbsp;${status.status}</strong>`;
          } else {
            formattedOrder += `&nbsp;&nbsp;&nbsp;<span class="status-dot upcoming"></span>`;
            formattedOrder += `<strong>&nbsp;&nbsp;&nbsp;${status.status}</strong>`;
          }
          formattedOrder += "</p>";
        }
      } else {
        formattedOrder += "<p>No statuses found</p>";
      }

      res.send(formattedOrder);
    } else {
      res.send("Order not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error connecting to "Мой склад" service');
  }
});

app.post("/orders", async (req, res) => {
  const orderId = req.body.orderId;

  try {
    const order = await getCustomerOrderById(orderId);
    if (order) {
      console.log(order);
      const redirectUrl = `http://80.90.184.111:3000/orders/${orderId}`;
      res.redirect(redirectUrl);
    } else {
      res.send("Order not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error connecting to "Мой склад" service');
  }
});

app.get("/orders/:orderId", async (req, res) => {
  const orderId = req.params.orderId;

  try {
    let order = await getCustomerOrderById(orderId);
    if (order) {
      const positions = await getCustomerOrderPositions(orderId);
      order.positions = positions;

      // Add timeline-based status to the order
      order = getStatusByTimeline(order);

      let formattedOrder = "";

      formattedOrder += "<h2>Статусы:</h2>";
      if (order.statuses?.length > 0) {
        for (const status of order.statuses) {
          formattedOrder += `<p><strong>Статус:</strong> ${status.status}`;
          if (status.ready) {
            formattedOrder += " (готово)";
          } else if (status.current) {
            formattedOrder += ` <span class="hh-grayBox"></span>`; // Добавление жирной точки
          }
          formattedOrder += "</p>";
        }
      } else {
        formattedOrder += "<p>No statuses found</p>";
      }

      formattedOrder += "<h2>Товары:</h2>";
      if (positions && positions.length > 0) {
        for (const position of positions) {
          //formattedOrder += `<p><strong>Position ID:</strong> ${position.id}</p>`;
          formattedOrder += `<p><strong>Название:</strong> ${position.assortment.name}</p>`;
          //formattedOrder += `<p><strong>Assortment ID:</strong> ${getAssortmentId(
          //position.assortment.meta.href
          //)}</p>`;

          // Get product images
          const baseProductLink = await getBaseProductLink(
            position.assortment.id
          );
          const baseProductId = baseProductLink
            ? baseProductLink.split("/").pop()
            : null;
          formattedOrder += `<p><strong>Base Product Link:</strong> ${baseProductLink}</p>`;
          formattedOrder += `<p><strong>Base Product ID:</strong> ${baseProductId}</p>`;

          if (baseProductId) {
            const images = await getProductImages(baseProductId);
            if (images && images.length > 0) {
              //formattedOrder += "<p><strong>Product Images:</strong></p>";
              for (const image of images) {
                formattedOrder += `<img src="${image.miniature.href}" style="margin-bottom: 10px;">`;
              }
            } else {
              formattedOrder += "<p>No product images found</p>";
            }
          } else {
            //formattedOrder += "<p>Unable to retrieve product images</p>";
          }
        }
      } else {
        formattedOrder += "<p>No positions found</p>";
      }

      formattedOrder += `<h2>Номер Заказа:</h2><p>${orderId}</p>`;
      //formattedOrder += `<p><strong>Name:</strong> ${order.name}</p>`;
      formattedOrder += `<p><strong>Описание:</strong> ${order.description.replace(
        /\n/g,
        "<br>"
      )}</p>`;

      res.send(formattedOrder);
    } else {
      res.send("Order not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error connecting to "Мой склад" service');
  }
});

async function getCustomerOrderById(orderId) {
  try {
    const url = `https://online.moysklad.ru/api/remap/1.2/entity/customerorder/${orderId}`;
    const authString = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );
    const authHeader = `Basic ${authString}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
      },
    });

    const order = response.data;
    const createdTime = order.moment;

    return {
      ...order,
      createdTime,
    };
  } catch (error) {
    throw error;
  }
}

async function getCustomerOrderPositions(orderId) {
  try {
    const url = `https://online.moysklad.ru/api/remap/1.2/entity/customerorder/${orderId}/positions?expand=assortment`;
    const authString = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );
    const authHeader = `Basic ${authString}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
      },
    });
    return response.data.rows.slice(0, -1);
  } catch (error) {
    throw error;
  }
}

async function getProductImages(productId) {
  try {
    const url = `https://online.moysklad.ru/api/remap/1.2/entity/product/${productId}/images?limit=20`;
    const authString = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );
    const authHeader = `Basic ${authString}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
      },
    });
    return response.data.rows;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getBaseProductLink(assortmentId) {
  try {
    const url = `https://online.moysklad.ru/api/remap/1.2/entity/variant/${assortmentId}`;
    const authString = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );
    const authHeader = `Basic ${authString}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: authHeader,
      },
    });
    const baseProductLink = response.data.product.meta.href;
    return baseProductLink;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function getAssortmentId(assortmentUrl) {
  const regex = /\/(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})\//;
  const match = assortmentUrl.match(regex);
  if (match) {
    return match[1];
  }
  return "";
}

function getStatusByTimeline(order) {
  let statuses = [
    { status: "Проверка оплаты", duration: 0, current: false, ready: false },
    { status: "Оплачен", duration: 0, current: false, ready: false },
    {
      status: "На закупке",
      duration: 5 * 60 * 60 * 1000,
      current: false,
      ready: false,
    },
    {
      status: "Закуплен",
      duration: 2 * 60 * 60 * 1000,
      current: false,
      ready: false,
    },
    {
      status: "Доставляется на склад в Австрии",
      duration: 1 * 24 * 60 * 60 * 1000,
      current: false,
      ready: false,
    },
    {
      status: "На складе в Австрии",
      duration: 5 * 24 * 60 * 60 * 1000,
      current: false,
      ready: false,
    },
    {
      status: "Доставляется в Армении",
      duration: 2 * 24 * 60 * 60 * 1000,
      current: false,
      ready: false,
    },
  ];

  const currentTime = new Date().getTime();
  const orderTime = new Date(order.createdTime).getTime();
  const timeDifference = currentTime - orderTime;

  let accumulatedTime = 0;
  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    accumulatedTime += status.duration;

    if (timeDifference < accumulatedTime) {
      status.current = true;
      status.ready = false;
    } else {
      status.current = false;
      status.ready = true;
    }
  }
  order.statuses = statuses;

  return order;
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

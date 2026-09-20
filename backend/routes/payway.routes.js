import express from "express";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

/* =========================================================
   ABA PAYWAY SANDBOX CONFIG
========================================================= */

const PAYWAY_API_URL =
  process.env.PAYWAY_API_URL ||
  "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr";

const MERCHANT_ID = process.env.PAYWAY_MERCHANT_ID;
const API_KEY = process.env.PAYWAY_API_KEY;

const CALLBACK_URL =
  process.env.PAYWAY_CALLBACK_URL;


/* =========================================================
   HELPERS
========================================================= */

function getReqTime() {
  const now = new Date();

  const pad = (value) =>
    String(value).padStart(2, "0");

  return (
    now.getUTCFullYear() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  );
}


function base64Encode(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return Buffer.from(
    String(value),
    "utf8"
  ).toString("base64");
}


/* =========================================================
   PAYWAY HASH
========================================================= */

function generatePayWayHash({
  reqTime,
  merchantId,
  tranId,
  amount,
  items,
  firstName,
  lastName,
  email,
  phone,
  purchaseType,
  paymentOption,
  callbackUrl,
  returnDeeplink,
  currency,
  customFields,
  returnParams,
  payout,
  lifetime,
  qrImageTemplate,
}) {

  /*
    ABA PayWay QR API hash order:

    req_time
    merchant_id
    tran_id
    amount
    items
    first_name
    last_name
    email
    phone
    purchase_type
    payment_option
    callback_url
    return_deeplink
    currency
    custom_fields
    return_params
    payout
    lifetime
    qr_image_template
  */

  const hashString =
    reqTime +
    merchantId +
    tranId +
    amount +
    (items || "") +
    (firstName || "") +
    (lastName || "") +
    (email || "") +
    (phone || "") +
    purchaseType +
    paymentOption +
    (callbackUrl || "") +
    (returnDeeplink || "") +
    currency +
    (customFields || "") +
    (returnParams || "") +
    (payout || "") +
    lifetime +
    qrImageTemplate;

  return crypto
    .createHmac(
      "sha512",
      API_KEY
    )
    .update(hashString, "utf8")
    .digest("base64");
}


/* =========================================================
   TEST / GENERATE QR
========================================================= */

router.post(
  "/generate-qr",
  async (req, res) => {

    try {

      if (!MERCHANT_ID) {
        return res.status(500).json({
          error:
            "PAYWAY_MERCHANT_ID is not configured.",
        });
      }

      if (!API_KEY) {
        return res.status(500).json({
          error:
            "PAYWAY_API_KEY is not configured.",
        });
      }

      if (!CALLBACK_URL) {
        return res.status(500).json({
          error:
            "PAYWAY_CALLBACK_URL is not configured.",
        });
      }


      const {
        amount,
        firstName = "Reachsei",
        lastName = "Customer",
        email = "customer@example.com",
        phone = "",
        orderId,
        items = [],
      } = req.body;


      /* =====================================================
         VALIDATE
      ===================================================== */

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          error: "Invalid payment amount.",
        });
      }

      if (!orderId) {
        return res.status(400).json({
          error: "orderId is required.",
        });
      }


      /*
        PayWay tran_id max length is limited.
        Make a short unique transaction ID.
      */

      const cleanOrderId =
        String(orderId)
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(-12);

      const tranId =
        `RS${Date.now()}${cleanOrderId}`
          .slice(0, 20);


      const reqTime =
        getReqTime();


      const formattedAmount =
        numericAmount.toFixed(2);


      /* =====================================================
         ITEMS
      ===================================================== */

      const paywayItems =
        items.map((item) => ({
          name:
            item.name ||
            "Reachsei Product",

          quantity:
            Number(item.quantity) || 1,

          price:
            Number(item.price) || 0,
        }));


      const itemsBase64 =
        base64Encode(
          JSON.stringify(paywayItems)
        );


      /* =====================================================
         CALLBACK
      ===================================================== */

      const callbackBase64 =
        base64Encode(
          CALLBACK_URL
        );


      /* =====================================================
         PAYWAY VALUES
      ===================================================== */

      const purchaseType =
        "purchase";

      const paymentOption =
        "abapay_khqr";

      const currency =
        "USD";

      const lifetime =
        30;

      const qrImageTemplate =
        "template3_color";


      /* =====================================================
         HASH
      ===================================================== */

      const hash =
        generatePayWayHash({
          reqTime,
          merchantId: MERCHANT_ID,
          tranId,
          amount: formattedAmount,
          items: itemsBase64,
          firstName,
          lastName,
          email,
          phone,
          purchaseType,
          paymentOption,
          callbackUrl: callbackBase64,
          returnDeeplink: null,
          currency,
          customFields: null,
          returnParams: null,
          payout: null,
          lifetime,
          qrImageTemplate,
        });


      /* =====================================================
         PAYWAY REQUEST
      ===================================================== */

      const payload = {
        req_time: reqTime,

        merchant_id:
          MERCHANT_ID,

        tran_id:
          tranId,

        first_name:
          firstName,

        last_name:
          lastName,

        email:
          email,

        phone:
          phone,

        amount:
          Number(formattedAmount),

        purchase_type:
          purchaseType,

        payment_option:
          paymentOption,

        items:
          itemsBase64,

        currency,

        callback_url:
          callbackBase64,

        return_deeplink:
          null,

        custom_fields:
          null,

        return_params:
          null,

        payout:
          null,

        lifetime,

        qr_image_template:
          qrImageTemplate,

        hash,
      };


      console.log(
        "PAYWAY REQUEST:",
        {
          merchant_id: MERCHANT_ID,
          tran_id: tranId,
          amount: formattedAmount,
          currency,
        }
      );


      /* =====================================================
         CALL ABA PAYWAY
      ===================================================== */

      const response =
        await axios.post(
          PAYWAY_API_URL,
          payload,
          {
            headers: {
              "Content-Type":
                "application/json",
            },

            timeout: 30000,
          }
        );


      const data =
        response.data;


      console.log(
        "PAYWAY RESPONSE:",
        {
          status: data?.status,
          tran_id: tranId,
        }
      );


      /* =====================================================
         CHECK RESPONSE
      ===================================================== */

      if (
        data?.status?.code !== "0"
      ) {

        return res.status(400).json({
          error:
            data?.status?.message ||
            "PayWay rejected the request.",

          payway:
            data,
        });
      }


      /* =====================================================
         SUCCESS
      ===================================================== */

      return res.json({

        success: true,

        orderId,

        tranId,

        amount:
          Number(formattedAmount),

        currency,

        qrString:
          data.qrString,

        qrImage:
          data.qrImage,

        abaPayDeeplink:
          data.abapay_deeplink,

        status:
          data.status,
      });

    } catch (error) {

      console.error(
        "PAYWAY GENERATE QR ERROR:",
        error.response?.data ||
        error.message
      );

      return res.status(500).json({

        success: false,

        error:
          error.response?.data ||
          error.message,

      });
    }
  }
);


/* =========================================================
   PAYWAY CALLBACK
========================================================= */

router.post(
  "/callback",
  express.json(),
  async (req, res) => {

    try {

      console.log(
        "================================="
      );

      console.log(
        "PAYWAY CALLBACK RECEIVED"
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      console.log(
        "================================="
      );


      const {
        transaction_id,
        merchant_ref,
        payment_status,
        payment_status_code,
        payment_amount,
        original_amount,
        payment_currency,
        bank_ref,
        apv,
      } = req.body;


      /*
        payment_status_code === 0
        means successful payment
        according to ABA's QR API docs.
      */

      if (
        Number(payment_status_code) === 0 ||
        payment_status === "APPROVED"
      ) {

        console.log(
          "PAYWAY PAYMENT APPROVED:",
          {
            transaction_id,
            merchant_ref,
            payment_amount,
            payment_currency,
            bank_ref,
            apv,
          }
        );

        /*
          NEXT STEP:
          Update the Reachsei order here.

          We will connect:
          merchant_ref -> Reachsei order
        */
      }


      return res.status(200).json({
        success: true,
      });

    } catch (error) {

      console.error(
        "PAYWAY CALLBACK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
      });
    }
  }
);


export default router;
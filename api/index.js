export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: "Afghani Coin Backend is running!",
    coin: "AFC"
  });
                       }

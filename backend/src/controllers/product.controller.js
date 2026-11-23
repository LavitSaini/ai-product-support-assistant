export const getAllActiveProducts = async (req, res) => {
  return res.status(200).json({ success: true, message: "Active Products!" });
};

export const getSingleProduct = async (req, res) => {};

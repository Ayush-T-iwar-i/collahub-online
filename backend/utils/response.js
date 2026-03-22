// utils/apiResponse.js
exports.success = (res, message, data = {}, status = 200) =>
  res.status(status).json({ success: true, message, data });

exports.error = (res, message, status = 500) =>
  res.status(status).json({ success: false, message });

exports.paginate = (res, data, total, page, limit) =>
  res.json({
    success: true,
    data,
    pagination: {
      total,
      page:       Number(page),
      limit:      Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
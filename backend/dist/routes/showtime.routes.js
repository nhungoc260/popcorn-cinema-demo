"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const showtime_controller_1 = require("../controllers/showtime.controller");
const router = (0, express_1.Router)();
router.get('/', showtime_controller_1.getShowtimes);
router.get('/:id', showtime_controller_1.getShowtime);
router.get('/:id/seats', showtime_controller_1.getShowtimeSeats);
exports.default = router;
//# sourceMappingURL=showtime.routes.js.map
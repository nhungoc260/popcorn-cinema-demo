"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("../controllers/ai.controller");
const router = (0, express_1.Router)();
router.post('/chat', ai_controller_1.aiChat);
exports.default = router;
//# sourceMappingURL=ai.routes.js.map
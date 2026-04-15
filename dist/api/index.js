"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vercel_1 = require("@hono/node-server/vercel");
const index_1 = __importDefault(require("../src/index"));
exports.default = (0, vercel_1.handle)(index_1.default);

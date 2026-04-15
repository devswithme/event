"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const xendit_node_1 = __importDefault(require("xendit-node"));
exports.default = new xendit_node_1.default({
    secretKey: process.env.XENDIT_SECRET_KEY,
});

import { Router } from "express";
import { getUsers, register, login, updateUser, deleteUser } from "../controllers/userController";

const router = Router();

router.get("/", getUsers);
router.post("/register", register);
router.post("/login", login);
router.put("/:id", updateUser); // <-- THÊM MỚI
router.delete("/:id", deleteUser); // <-- THÊM MỚI

export default router;
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function deleteAllData(orderedFileNames: string[]) {
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  });

  // [SỬA Ở ĐÂY]: Dùng .reverse() để lật ngược danh sách, giúp xóa Bảng con trước Bảng cha
  for (const modelName of modelNames.reverse()) {
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model) {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } else {
      console.error(
        `Model ${modelName} not found. Please ensure the model name is correctly specified.`
      );
    }
  }
}

async function main() {
  const dataDirectory = path.join(__dirname, "seedData");

  // Thứ tự nạp dữ liệu (Cha nạp trước, Con nạp sau)
  const orderedFileNames = [
    "products.json",
    "expenseSummary.json",
    "users.json",
    "expenses.json",
    "expenseByCategory.json",
  ];

  // Gọi hàm xóa (Hàm này đã được đảo ngược mảng ở bên trong)
  await deleteAllData([...orderedFileNames]); // Truyền bản sao của mảng để không làm thay đổi mảng gốc

  // Vòng lặp nạp dữ liệu (Giữ nguyên thứ tự chuẩn)
  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found, skipping: ${fileName}`);
      continue;
    }
    
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const modelName = path.basename(fileName, path.extname(fileName));
    const model: any = prisma[modelName as keyof typeof prisma];

    if (!model) {
      console.error(`No Prisma model matches the file name: ${fileName}`);
      continue;
    }

    for (const data of jsonData) {
      await model.create({
        data,
      });
    }

    console.log(`Seeded ${modelName} with data from ${fileName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
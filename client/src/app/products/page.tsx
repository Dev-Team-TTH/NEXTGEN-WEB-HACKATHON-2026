"use client";

import { useCreateProductMutation, useGetProductsQuery } from "@/state/api";
import { PlusCircleIcon, Search, PackageOpen, ClipboardList } from "lucide-react";
import { useState, useMemo } from "react";
import Header from "@/app/(components)/Header";
import Rating from "@/app/(components)/Rating";
import CreateProductModal from "./CreateProductModal";
import Image from "next/image";
import { useTranslation } from "react-i18next";

type ProductFormData = {
  name: string;
  price: number;
  stockQuantity: number;
  rating: number;
};

const Products = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    data: products,
    isLoading,
    isError,
  } = useGetProductsQuery();

  const [createProduct] = useCreateProductMutation();
  const handleCreateProduct = async (productData: ProductFormData) => {
    await createProduct(productData);
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return products.filter((product) => 
      product.name.toLowerCase().includes(lowerCaseSearch)
    );
  }, [products, searchTerm]);

  if (isLoading) {
    return <div className="py-4 text-center text-gray-500 dark:text-gray-400 font-medium">{t("products.loading")}</div>;
  }

  if (isError || !products) {
    return (
      <div className="text-center text-red-500 py-4 font-semibold bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mt-5">
        {t("products.error")}
      </div>
    );
  }

  return (
    <div className="mx-auto pb-10 w-full">
      <Header 
        name={t("sidebar.products")} 
        subtitle={t("pages.productsSubtitle")}
        icon={ClipboardList}
        action={
          <button
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" /> 
            {t("products.createBtn")}
          </button>
        }
      />

      <div className="mt-2 mb-8 flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 transition-colors shadow-sm w-full md:w-1/2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 overflow-hidden">
        <Search className="w-5 h-5 text-gray-400 ml-4 mr-2" />
        <input
          className="w-full py-3 px-2 bg-transparent focus:outline-none dark:text-white text-gray-800 font-medium"
          placeholder={t("products.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-between">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full col-span-full py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed">
            <PackageOpen className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <span className="text-lg font-medium text-center">
              {t("products.empty")} <br/>
              <span className="text-blue-600 dark:text-blue-400 font-bold">"{searchTerm}"</span>
            </span>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.productId}
              className="group border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl rounded-2xl p-5 w-full mx-auto transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center">
                <div className="relative overflow-hidden rounded-2xl mb-4">
                  <Image
                    src={`/product${Math.floor(Math.random() * 3) + 1}.png`}
                    alt={product.name}
                    width={150}
                    height={150}
                    className="w-40 h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                
                <h3 className="text-lg text-gray-900 dark:text-white font-bold text-center line-clamp-1 mb-1">
                  {product.name}
                </h3>
                
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 my-1">
                  ${product.price.toFixed(2)}
                </p>
                
                <div className="flex items-center justify-between w-full px-2 mt-3">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {t("products.stock")}: {product.stockQuantity}
                  </div>
                  {product.rating && (
                    <div className="flex items-center">
                      <Rating rating={product.rating} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProduct}
      />
    </div>
  );
};

export default Products;
import Navbar from "./Navbar";

export default function ShopLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

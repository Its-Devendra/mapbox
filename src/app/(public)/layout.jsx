export default function PublicLayout({ children }) {
    return (
      <main className="flex flex-col h-screen">
        {/* <h1 className="p-2 bg-gray-100 border-b">Interactive Map</h1> */}
        {/* This ensures the child (our page) can use flexbox */}
        <div className="flex flex-grow overflow-hidden">
          {children}
        </div>
      </main>
    );
  }
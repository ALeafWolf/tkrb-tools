import Header from "./components/Navigation/Header";
import ExpCalculator from "./components/Calculator/ExpCalculator";

function App() {
  return (
    <div className="bg-linear-to-br from-blue-500 to-purple-600 relative min-h-screen">
      <Header />
      <ExpCalculator />
    </div>
  );
}

export default App;

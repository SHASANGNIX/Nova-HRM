import { useEffect, useState } from "react";

function App() {
  const [user, setUser] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/users")
      .then(res => res.json())
      .then(json => setUser(json))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      {user.map(data => (
        <div key={data.id}>
          <h1>Name: {data.name}</h1>
          <h1>Username: {data.username}</h1>
          <h1>Email: {data.email}</h1>
        </div>
      ))}
    </div>
  );
}

export default App;

import { RouterProvider } from "react-router"
import { router } from "./app.routes.jsx"
// The auth context file is directly under features.
import { AuthProvider } from "./features/auth.context.jsx"
import { InterviewProvider } from "./features/interview/interview.context.jsx"

function App() {

  return (
    <AuthProvider>
      <InterviewProvider>
        <RouterProvider router={router} />
      </InterviewProvider>
    </AuthProvider>
  )
}

export default App
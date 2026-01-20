# Guardian Agent API Documentation

Base URL: `http://localhost:3000` (default)

## Authentication

All protected routes require a JSON Web Token (JWT) in the `Authorization` header.

**Header Format:**
`Authorization: Bearer <your_token>`

---

## Auth Routes

### Register User
Create a new user account.

-   **URL**: `/auth/register`
-   **Method**: `POST`
-   **Auth**: Public
-   **Body**:
    ```json
    {
      "email": "user@example.com",
      "name": "John Doe",
      "password": "securePassword123"
    }
    ```
-   **Response** (201):
    ```json
    {
      "message": "User registered successfully",
      "token": "jwt_token_string",
      "user": { ... }
    }
    ```

### Login
Authenticate an existing user.

-   **URL**: `/auth/login`
-   **Method**: `POST`
-   **Auth**: Public
-   **Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123"
    }
    ```
-   **Response** (200):
    ```json
    {
      "message": "Login successful",
      "user": {
        "id": "60d0fe4f5311236168a109ca",
        "name": "John Doe",
        "email": "user@example.com"
      },
      "token": "jwt_token_string"
    }
    ```

---

## User Routes

### Get All Users
Retrieve a list of all registered users.

-   **URL**: `/users`
-   **Method**: `GET`
-   **Auth**: Required
-   **Response** (200):
    ```json
    {
      "message": "Users retrieved successfully",
      "count": 5,
      "users": [ ... ]
    }
    ```

### Get User by ID
Retrieve details of a specific user.

-   **URL**: `/users/:id`
-   **Method**: `GET`
-   **Auth**: Required
-   **Response** (200):
    ```json
    {
      "message": "User retrieved successfully",
      "user": { ... }
    }
    ```

### Update User
Update user details.

-   **URL**: `/users/:id`
-   **Method**: `PUT`
-   **Auth**: Required
-   **Body** (Partial):
    ```json
    {
      "name": "Jane Doe"
    }
    ```
-   **Response** (200):
    ```json
    {
      "message": "User updated successfully",
      "user": { ... }
    }
    ```

### Delete User
Delete a user account.

-   **URL**: `/users/:id`
-   **Method**: `DELETE`
-   **Auth**: Required
-   **Response** (200):
    ```json
    {
      "message": "User deleted successfully",
      "user": { ... }
    }
    ```

---

## Agent Routes

### Execute Agent (Theft Guardian)
Send sensor signals to the agent to determine theft state and execute actions via MobileRun.

-   **URL**: `/agent/execute`
-   **Method**: `POST`
-   **Auth**: Required
-   **Body**:
    ```json
    {
      "signals": [
        {
          "type": "face_lock_fail",
          "timestamp": 1715000000000,
          "metadata": { "attemptCount": 2 }
        },
        {
          "type": "location_jump",
          "timestamp": 1715000005000
        }
      ],
      "context": {
        "ownerName": "Abhinav",
        "lastKnownLocation": "12.9716, 77.5946",
        "batteryLevel": 85
      }
    }
    ```

### Available Signals

The `signals` array in the request body supports the following types:

| Signal Type | Description |
| :--- | :--- |
| `face_lock_fail` | Face unlock attempt failed. Use `metadata.attemptCount` to indicate consecutive failures. |
| `wrong_pin` | Incorrect PIN entered. |
| `sudden_jerk` | Device accelerometer detected a sudden high-G movement (snatching motion). |
| `screen_on_off_quick` | Screen was toggled ON and OFF rapidly (nervous checking). |
| `location_jump` | Device location changed significantly in a short time (fast getaway). |
| `sim_change` | SIM card was removed or swapped. |
| `power_off_attempt` | User attempted to power off the device while locked (Critical trigger). |

-   **Response** (200):
    ```json
    {
      "success": true,
      "state": "THEFT_MODE",
      "score": 70,
      "agentResponse": {
        "id": "mobilerun_task_id",
        "streamUrl": "...",
        "token": "..."
      }
    }
    ```

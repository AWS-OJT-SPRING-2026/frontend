# Hệ thống học tập - Frontend

Nền tảng giảng dạy trực tuyến với React + TypeScript + Vite

## Tính năng

- Đăng nhập và đăng ký tài khoản với giao diện hiện đại
- Tự động gán vai trò học sinh mặc định khi đăng ký
- Phân quyền giáo viên và học sinh
- Giao diện đẹp mắt, responsive với nhiều hiệu ứng animation
- Gradient đẹp, shadow effects, transition mượt mà
- Dashboard thân thiện với người dùng
- Sẵn sàng kết nối với backend Java Spring Boot

## Cài đặt

```bash
npm install
```

## Cấu hình

Cấu hình URL API backend trong file `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Thay đổi URL trên thành địa chỉ backend của bạn.

## API Endpoints yêu cầu từ Backend

Backend Java Spring Boot của bạn cần cung cấp các endpoints sau:

### 1. Đăng nhập
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200 OK):
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Tên người dùng",
    "role": "teacher" | "student"
  }
}
```

### 2. Đăng ký
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Tên người dùng",
  "role": "teacher" | "student"
}

Response (200 OK):
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Tên người dùng",
    "role": "teacher" | "student"
  }
}
```

## CORS Configuration

Backend cần cấu hình CORS để cho phép frontend truy cập. Thêm vào Spring Boot:

```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:5173")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true);
            }
        };
    }
}
```

## Chạy Development Server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

## Build Production

```bash
npm run build
```

## Cấu trúc thư mục

```
src/
├── components/          # React components
│   ├── Login.tsx       # Trang đăng nhập
│   ├── Register.tsx    # Trang đăng ký
│   └── Dashboard.tsx   # Trang chính sau đăng nhập
├── context/            # React Context
│   └── AuthContext.tsx # Quản lý trạng thái xác thực
├── services/           # API services
│   ├── api.ts         # HTTP client
│   └── authService.ts # Authentication service
├── types/             # TypeScript types
│   └── auth.ts        # Auth types
├── App.tsx            # Component chính
└── main.tsx           # Entry point
```

## Công nghệ sử dụng

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

## Lưu ý

- Token được lưu trong localStorage với key `auth_token`
- Thông tin user được lưu trong localStorage với key `user`
- Frontend tự động gửi token trong header `Authorization: Bearer <token>` khi cần

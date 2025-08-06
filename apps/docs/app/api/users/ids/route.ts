import { NextRequest, NextResponse } from "next/server";

interface UserRecord {
  userIdx?: string | number;
  userName?: string;
  // Legacy support for existing formats
  id?: string;
  userId?: string;
  value?: string;
  name?: string;
  username?: string;
  label?: string;
}

export async function GET(request: NextRequest) {
  try {
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;

    if (!authUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_AUTH_URL is not configured" }, { status: 500 });
    }

    // Get token from request headers
    const token = request.headers.get("authorization");

    if (!token) {
      return NextResponse.json({ error: "Authorization token is required" }, { status: 401 });
    }

    // Construct the full URL for fetching user IDs
    const usersApiUrl = `${authUrl}/users/ids`;

    // Fetch user IDs from the external API
    const response = await fetch(usersApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token, // Use the token from client
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch users from ${usersApiUrl}:`, response.statusText);
      return NextResponse.json(
        {
          error: "Failed to fetch users",
          details: `External API responded with ${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const usersData = await response.json();

    // Transform the data to match combobox format
    // Assuming the API returns either an array of user objects or user strings
    let formattedUsers;

    if (Array.isArray(usersData)) {
      formattedUsers = usersData.map((user) => {
        // If user is an object, prioritize userName and userIdx
        if (typeof user === "object" && user !== null) {
          return user.userName;
          // value: user.userIdx?.toString() || user.id || user.userId || user.value || user.toString(),
          // label: user.userName || user.name || user.username || user.label || user.toString(),
        }
        // If user is just a string
        else if (typeof user === "string") {
          return {
            value: user,
            label: user,
          };
        }
        // Fallback for other structures
        else {
          return {
            value: user?.toString() || "",
            label: user?.toString() || "",
          };
        }
      });
    } else {
      // If response is not an array, try to extract users from a property
      const users = usersData.users || usersData.data || [];
      formattedUsers = users.map(
        (user: UserRecord) => user?.userName
        // value: user?.userIdx?.toString() || user?.id || user?.userId || user?.value || user?.toString() || "",
        // label: user?.userName || user?.name || user?.username || user?.label || user?.toString() || "",
      );
    }

    return NextResponse.json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

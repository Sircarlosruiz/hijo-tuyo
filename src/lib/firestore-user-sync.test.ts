import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncUserToFirestore } from "./firestore-user-sync";

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual("firebase/firestore");
  return {
    ...actual,
    doc: vi.fn().mockReturnValue({ id: "test-uid" }),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn().mockReturnValue({}),
  };
});

vi.mock("./firebase-client", () => ({
  getFirestoreInstance: vi.fn(),
}));

describe("syncUserToFirestore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call setDoc with merge true", async () => {
    const { setDoc, doc } = await import("firebase/firestore");
    const mockSetDoc = vi.mocked(setDoc);
    const mockDoc = vi.mocked(doc);

    mockSetDoc.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({ id: "test-uid" } as never);

    const mockUser = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: "https://example.com/photo.jpg",
    } as never;

    await syncUserToFirestore(mockUser);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        name: "Test User",
        email: "test@example.com",
        photoURL: "https://example.com/photo.jpg",
      }),
      { merge: true },
    );
  });

  it("should handle null displayName and photoURL", async () => {
    const { setDoc, doc } = await import("firebase/firestore");
    const mockSetDoc = vi.mocked(setDoc);
    const mockDoc = vi.mocked(doc);

    mockSetDoc.mockResolvedValue(undefined);
    mockDoc.mockReturnValue({ id: "test-uid" } as never);

    const mockUser = {
      uid: "test-uid",
      displayName: null,
      email: "test@example.com",
      photoURL: null,
    } as never;

    await syncUserToFirestore(mockUser);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        name: null,
        email: "test@example.com",
        photoURL: null,
      }),
      { merge: true },
    );
  });

  it("should not throw when Firestore write fails", async () => {
    const { setDoc, doc } = await import("firebase/firestore");
    const mockSetDoc = vi.mocked(setDoc);
    const mockDoc = vi.mocked(doc);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockSetDoc.mockRejectedValue(new Error("Network error"));
    mockDoc.mockReturnValue({ id: "test-uid" } as never);

    const mockUser = {
      uid: "test-uid",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: null,
    } as never;

    await expect(syncUserToFirestore(mockUser)).resolves.not.toThrow();

    consoleError.mockRestore();
  });
});

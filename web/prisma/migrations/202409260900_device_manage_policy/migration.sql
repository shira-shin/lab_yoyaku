CREATE TYPE "DeviceManagePolicy" AS ENUM ('HOST_ONLY','MEMBERS_ALLOWED');
ALTER TABLE "Group" ADD COLUMN "deviceManagePolicy" "DeviceManagePolicy" NOT NULL DEFAULT 'HOST_ONLY';

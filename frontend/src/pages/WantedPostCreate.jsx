import React from "react";
import CreateListing from "./CreateListing";

export default function WantedPostCreate(props) {
  return <CreateListing {...props} initialTab="wanted" />;
}
